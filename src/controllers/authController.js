const User = require('../models/User');
const Session = require('../models/Session');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const generateOTP = require('../utils/generateOTP');
const { parseUserAgent, getClientIp, getLocationFromIp, extractDeviceInfo, formatDevice } = require('../utils/deviceParser');
const { sendVerificationEmail, sendOTPEmail, sendWelcomeEmail, sendResetPasswordEmail, sendUnlockAccountEmail } = require('../services/emailService');
const { logAuditEvent } = require('../services/auditService');
const { detectAndHandleLoginAnomaly } = require('../services/anomalyService');
const { dispatchWebhookEvent } = require('../services/webhookService');

exports.signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔑 Generate secure 1-click verification token & 6-digit fallback
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const otp = generateOTP();

    const user = await User.create({
      email,
      password: hashedPassword,
      verificationToken,
      verificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      otp,
      otpExpiry: Date.now() + 15 * 60 * 1000 // 15 min fallback
    });

    // 📩 Send 1-click Verification Email
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const verifyLink = `${clientUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
    await sendVerificationEmail(user, verifyLink);
    
    // Also trigger OTP email mock if in test environment for backwards compatibility
    if (process.env.NODE_ENV === 'test') {
      await sendOTPEmail(user, otp);
    }

    const userResponse = {
      _id: user._id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    };

    // 🔗 Dispatch Outbound Webhook Event (user.signup)
    dispatchWebhookEvent('user.signup', {
      userId: user._id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }, user._id).catch(() => {});

    res.status(201).json({
      msg: "User created. Verification email sent",
      user: userResponse
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📩 1-CLICK EMAIL VERIFICATION
exports.verifyEmail = async (req, res) => {
  try {
    const { email, token } = req.body;
    const deviceInfo = extractDeviceInfo(req);

    if (!email || !token) {
      return res.status(400).json({ msg: "Email and verification token are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (user.isVerified) {
      return res.json({ msg: "Account is already verified. You may sign in." });
    }

    if (!user.verificationToken || user.verificationToken !== token) {
      return res.status(400).json({ msg: "Invalid or expired verification link" });
    }

    if (user.verificationExpires && user.verificationExpires < Date.now()) {
      return res.status(400).json({ msg: "Verification link has expired. Please request a new one." });
    }

    // Activate user
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationExpires = null;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    // 🛡️ Log EMAIL_VERIFIED to Immutable Security Audit Trail
    await logAuditEvent({
      userId: user._id,
      userEmail: user.email,
      action: 'EMAIL_VERIFIED',
      status: 'SUCCESS',
      riskLevel: 'LOW',
      deviceInfo,
      metadata: { method: "1_click_email_link" }
    });

    // Auto-login: issue access and refresh tokens
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );
    user.refreshToken = refreshToken;
    await user.save();

    const session = await Session.create({
      userId: user._id,
      refreshToken,
      deviceType: deviceInfo.deviceType || 'Desktop',
      browser: deviceInfo.browser || 'Browser',
      os: deviceInfo.os || 'OS',
      ipAddress: deviceInfo.ipAddress || '127.0.0.1',
      location: deviceInfo.location || 'Local Network',
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // 🔗 Dispatch Outbound Webhook Event (user.verified)
    dispatchWebhookEvent('user.verified', {
      userId: user._id,
      email: user.email,
      verifiedAt: new Date().toISOString()
    }, user._id).catch(() => {});

    res.json({
      msg: "Account verified successfully! Welcome to AuthX.",
      accessToken,
      refreshToken,
      sessionId: session._id,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// OTP VERIFICATION (Kept for backwards compatibility and test suites)
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ msg: "Invalid OTP" });
    }

    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({ msg: "OTP expired" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    user.verificationToken = null;
    user.verificationExpires = null;

    await user.save();

    // 🔗 Dispatch Outbound Webhook Event (user.verified)
    dispatchWebhookEvent('user.verified', {
      userId: user._id,
      email: user.email,
      verifiedAt: new Date().toISOString()
    }, user._id).catch(() => {});

    res.json({ msg: "Account verified successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const deviceInfo = extractDeviceInfo(req);

    // 1. Check if user exists
    const user = await User.findOne({ email: email ? email.toLowerCase().trim() : '' });
    if (!user) {
      await logAuditEvent({
        userEmail: email || 'unknown',
        action: 'LOGIN_FAILED',
        status: 'FAILURE',
        deviceInfo,
        metadata: { reason: "User does not exist" }
      });
      return res.status(400).json({ msg: "User not found" });
    }

    // 2. Check if verified
    if (!user.isVerified) {
      return res.status(400).json({ msg: "Please verify your account first" });
    }

    // Check if account is locked
    if (user.isLocked || (user.lockUntil && user.lockUntil > Date.now())) {
      const lockMsg = user.isLocked
        ? (user.lockReason || "Your account has been locked for security. Please contact an administrator.")
        : "Account temporarily locked due to multiple failed attempts. Try again later.";

      await logAuditEvent({
        userId: user._id,
        userEmail: user.email,
        action: 'LOGIN_FAILED',
        status: 'ALERT',
        riskLevel: 'CRITICAL',
        deviceInfo,
        metadata: {
          reason: "Sign-in attempt on locked account",
          isLocked: !!user.isLocked,
          lockReason: user.lockReason,
          lockUntil: user.lockUntil
        }
      });

      return res.status(403).json({ msg: lockMsg });
    }

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.loginAttempts += 1;

      // Lock after 5 attempts
      let isNowLocked = false;
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000; // 15 min
        user.loginAttempts = 0;
        isNowLocked = true;
      }

      await user.save();

      if (isNowLocked) {
        await logAuditEvent({
          userId: user._id,
          userEmail: user.email,
          action: 'FAILED_ATTEMPT_LOCKED',
          status: 'ALERT',
          riskLevel: 'CRITICAL',
          deviceInfo,
          metadata: {
            attempts: 5,
            lockDurationMinutes: 15,
            message: "Account automatically locked due to 5 consecutive failed login attempts"
          }
        });
      } else {
        await logAuditEvent({
          userId: user._id,
          userEmail: user.email,
          action: 'LOGIN_FAILED',
          status: 'FAILURE',
          riskLevel: 'MEDIUM',
          deviceInfo,
          metadata: {
            attempts: user.loginAttempts,
            remainingAttempts: 5 - user.loginAttempts
          }
        });
      }

      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // 🔐 If user has 2FA enabled, issue temporary challenge token instead of final tokens
    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign(
        { userId: user._id, require2FA: true },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '5m' }
      );
      return res.json({
        twoFactorRequired: true,
        tempToken,
        msg: "Two-factor authentication code required"
      });
    }

    // 🚨 PROACTIVE ANOMALY DETECTION ENGINE
    const anomalyResult = await detectAndHandleLoginAnomaly(user, deviceInfo, req);

    // ACCESS TOKEN (short life)
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' }
    );

    // REFRESH TOKEN (long life)
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    // Save refresh token in DB
    user.refreshToken = refreshToken;

    // Reset login attempts on success
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // 🖥️ Create Multi-Device Session Record
    const session = await Session.create({
      userId: user._id,
      refreshToken,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      ipAddress: deviceInfo.ipAddress,
      location: deviceInfo.location,
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // 🛡️ Log LOGIN_SUCCESS to Immutable Security Audit Trail
    await logAuditEvent({
      userId: user._id,
      userEmail: user.email,
      action: 'LOGIN_SUCCESS',
      status: anomalyResult.isSuspicious ? 'ALERT' : 'SUCCESS',
      isSuspicious: anomalyResult.isSuspicious,
      riskLevel: anomalyResult.isSuspicious ? 'HIGH' : 'LOW',
      deviceInfo,
      metadata: {
        sessionId: session._id,
        isSuspicious: anomalyResult.isSuspicious,
        reasons: anomalyResult.reasons || [],
        securityAlertEmailSent: anomalyResult.isSuspicious,
        authMethod: 'password'
      }
    });

    res.json({
      msg: "Login successful",
      accessToken,
      refreshToken,
      sessionId: session._id,
      isSuspicious: anomalyResult.isSuspicious,
      suspiciousDetails: anomalyResult.isSuspicious
        ? {
            message: `New login detected from ${deviceInfo.browser} on ${deviceInfo.os} (IP: ${deviceInfo.ipAddress}). An alert email was dispatched.`,
            reasons: anomalyResult.reasons
          }
        : null
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const deviceInfo = extractDeviceInfo(req);

    const user = await User.findOne({ email });

    if (!user) {
      await logAuditEvent({
        userEmail: email || 'unknown',
        action: 'PASSWORD_RESET_REQUEST',
        status: 'FAILURE',
        deviceInfo,
        metadata: { reason: "User not found" }
      });
      return res.status(400).json({ msg: "User not found" });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 min

    await user.save();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const resetLink = `${clientUrl}/reset-password/${token}`;

    await sendResetPasswordEmail(user, resetLink);

    // 🛡️ Log PASSWORD_RESET_REQUEST
    await logAuditEvent({
      userId: user._id,
      userEmail: user.email,
      action: 'PASSWORD_RESET_REQUEST',
      status: 'SUCCESS',
      deviceInfo,
      metadata: { tokenExpiryMinutes: 10 }
    });

    res.json({ msg: "Password reset link sent to email" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const deviceInfo = extractDeviceInfo(req);

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ msg: "Invalid or expired token" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Clear reset and lock fields (password reset proves email ownership and restores account access)
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.isLocked = false;
    user.lockUntil = null;
    user.lockReason = null;
    user.loginAttempts = 0;

    await user.save();

    // 🛡️ Log PASSWORD_RESET_SUCCESS
    await logAuditEvent({
      userId: user._id,
      userEmail: user.email,
      action: 'PASSWORD_RESET_SUCCESS',
      status: 'SUCCESS',
      deviceInfo,
      metadata: { message: "Password successfully changed" }
    });

    res.json({ msg: "Password reset successful" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.refreshTokenHandler = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ msg: "No refresh token provided" });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(403).json({ msg: "User not found" });
    }

    if (user.isLocked || (user.lockUntil && user.lockUntil > Date.now())) {
      return res.status(403).json({ msg: "Account is locked. Refresh token rejected." });
    }

    // 🛡️ Multi-session Check: Query Session collection
    const session = await Session.findOne({
      refreshToken,
      userId: user._id
    });

    if (session) {
      if (session.isRevoked) {
        return res.status(403).json({ msg: "Session has been revoked. Please log in again." });
      }
      if (session.expiresAt && session.expiresAt < new Date()) {
        return res.status(403).json({ msg: "Session has expired" });
      }
      // Update lastActiveAt timestamp
      session.lastActiveAt = new Date();
      await session.save();
    } else {
      // Fallback check for legacy tokens or mock tests
      if (user.refreshToken !== refreshToken) {
        return res.status(403).json({ msg: "Invalid refresh token" });
      }
    }

    const newAccessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      accessToken: newAccessToken
    });

  } catch (error) {
    res.status(403).json({ msg: "Invalid or expired refresh token" });
  }
};

// 🔐 TWO-FACTOR AUTHENTICATION LOGIN CHALLENGE
exports.login2FA = async (req, res) => {
  try {
    const { tempToken, code, isBackupCode } = req.body;
    const deviceInfo = extractDeviceInfo(req);

    if (!tempToken || !code) {
      return res.status(400).json({ msg: "Authentication challenge token and code are required" });
    }

    const speakeasy = require('speakeasy');

    const decoded = jwt.verify(tempToken, process.env.ACCESS_TOKEN_SECRET);
    if (!decoded.require2FA) {
      return res.status(400).json({ msg: "Invalid 2FA challenge token" });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ msg: "2FA is not active on this account" });
    }

    if (user.isLocked || (user.lockUntil && user.lockUntil > Date.now())) {
      return res.status(403).json({ msg: "Account is locked." });
    }

    let verified = false;

    if (isBackupCode) {
      const cleanCode = code.trim().toUpperCase();
      const backupCodes = user.twoFactorBackupCodes || [];

      let matchedIndex = -1;
      for (let i = 0; i < backupCodes.length; i++) {
        if (!backupCodes[i].used) {
          const match = await bcrypt.compare(cleanCode, backupCodes[i].codeHash);
          if (match) {
            matchedIndex = i;
            break;
          }
        }
      }

      if (matchedIndex === -1) {
        await logAuditEvent({
          userId: user._id,
          userEmail: user.email,
          action: 'LOGIN_FAILED',
          status: 'FAILURE',
          deviceInfo,
          metadata: { reason: "Invalid backup code entered" }
        });
        return res.status(400).json({ msg: "Invalid or already used backup code" });
      }

      // Mark the emergency backup code as used
      user.twoFactorBackupCodes[matchedIndex].used = true;
      await user.save();
      verified = true;
    } else {
      verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: code.trim(),
        window: 1
      });
    }

    if (!verified) {
      await logAuditEvent({
        userId: user._id,
        userEmail: user.email,
        action: 'LOGIN_FAILED',
        status: 'FAILURE',
        deviceInfo,
        metadata: { reason: "Invalid TOTP authenticator code" }
      });
      return res.status(400).json({ msg: "Invalid 6-digit authenticator code" });
    }

    // 🚨 PROACTIVE ANOMALY DETECTION ENGINE
    const anomalyResult = await detectAndHandleLoginAnomaly(user, deviceInfo, req);

    // Authenticated! Issue tokens & register session
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    user.refreshToken = refreshToken;
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    const session = await Session.create({
      userId: user._id,
      refreshToken,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      ipAddress: deviceInfo.ipAddress,
      location: deviceInfo.location,
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // 🛡️ Log LOGIN_SUCCESS to Immutable Security Audit Trail
    await logAuditEvent({
      userId: user._id,
      userEmail: user.email,
      action: 'LOGIN_SUCCESS',
      status: anomalyResult.isSuspicious ? 'ALERT' : 'SUCCESS',
      isSuspicious: anomalyResult.isSuspicious,
      riskLevel: anomalyResult.isSuspicious ? 'HIGH' : 'LOW',
      deviceInfo,
      metadata: {
        sessionId: session._id,
        authMethod: isBackupCode ? '2fa_backup_code' : '2fa_totp',
        isSuspicious: anomalyResult.isSuspicious,
        reasons: anomalyResult.reasons || [],
        securityAlertEmailSent: anomalyResult.isSuspicious
      }
    });

    res.json({
      msg: "Login successful with 2FA",
      accessToken,
      refreshToken,
      sessionId: session._id,
      isSuspicious: anomalyResult.isSuspicious,
      suspiciousDetails: anomalyResult.isSuspicious
        ? {
            message: `New login detected from ${deviceInfo.browser} on ${deviceInfo.os} (IP: ${deviceInfo.ipAddress}). Alert email dispatched.`,
            reasons: anomalyResult.reasons
          }
        : null
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: "2FA challenge session expired. Please log in again." });
    }
    res.status(500).json({ error: error.message });
  }
};

// 🔒 INSTANT ACCOUNT LOCK (Triggered by user from email alert)
exports.lockAccount = async (req, res) => {
  try {
    const { token, email } = req.body;
    const deviceInfo = extractDeviceInfo(req);

    if (!token || !email) {
      return res.status(400).json({ msg: "Lock token and email are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (!user.accountLockToken || user.accountLockToken !== token) {
      return res.status(400).json({ msg: "Invalid or already used account lock token" });
    }

    if (user.accountLockExpires && user.accountLockExpires < Date.now()) {
      return res.status(400).json({ msg: "Account lock token has expired" });
    }

    // Lock user account immediately
    user.isLocked = true;
    user.lockReason = "Account instantly locked by user following suspicious login notification";
    user.accountLockToken = null;
    user.accountLockExpires = null;
    user.refreshToken = null;
    await user.save();

    // Revoke all active sessions immediately
    await Session.updateMany(
      { userId: user._id },
      { $set: { isRevoked: true } }
    );

    // 🛡️ Log ACCOUNT_LOCKED to Immutable Audit Trail
    await logAuditEvent({
      userId: user._id,
      userEmail: user.email,
      action: 'ACCOUNT_LOCKED',
      status: 'ALERT',
      riskLevel: 'CRITICAL',
      deviceInfo,
      metadata: {
        reason: "User confirmed instant account lock via security alert email",
        sessionsTerminated: true
      }
    });

    // 🔗 Dispatch Outbound Webhook Event (user.locked)
    dispatchWebhookEvent('user.locked', {
      userId: user._id,
      email: user.email,
      reason: user.lockReason,
      lockedAt: new Date().toISOString()
    }, user._id).catch(() => {});

    res.json({
      msg: "Your account has been locked instantly and all active sessions have been terminated. Please contact your administrator to unlock your account.",
      email: user.email,
      lockedAt: new Date()
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔒 DIRECT BROWSER CLICK LOCK ENDPOINT (For direct link inside email)
exports.lockAccountDirect = async (req, res) => {
  try {
    const { token, email } = req.query;
    const deviceInfo = extractDeviceInfo(req);

    if (!token || !email) {
      return res.status(400).send("<h3>Missing token or email parameter.</h3>");
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || user.accountLockToken !== token) {
      return res.status(400).send(`
        <div style="font-family: sans-serif; text-align: center; padding: 40px; background: #0f172a; color: #fff; min-height: 100vh;">
          <h2 style="color: #ef4444;">Invalid or Expired Lock Link</h2>
          <p>This security link is no longer valid or your account is already secured.</p>
          <a href="/login" style="color: #38bdf8; text-decoration: none;">Return to Login</a>
        </div>
      `);
    }

    user.isLocked = true;
    user.lockReason = "Account instantly locked by user following suspicious login notification";
    user.accountLockToken = null;
    user.accountLockExpires = null;
    user.refreshToken = null;
    await user.save();

    await Session.updateMany({ userId: user._id }, { $set: { isRevoked: true } });

    await logAuditEvent({
      userId: user._id,
      userEmail: user.email,
      action: 'ACCOUNT_LOCKED',
      status: 'ALERT',
      riskLevel: 'CRITICAL',
      deviceInfo,
      metadata: {
        reason: "Instant account lock executed via direct email click",
        sessionsTerminated: true
      }
    });

    // 🔗 Dispatch Outbound Webhook Event (user.locked)
    dispatchWebhookEvent('user.locked', {
      userId: user._id,
      email: user.email,
      reason: user.lockReason,
      lockedAt: new Date().toISOString()
    }, user._id).catch(() => {});

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    res.redirect(`${clientUrl}/login?accountLocked=true&email=${encodeURIComponent(user.email)}`);

  } catch (error) {
    res.status(500).send(`Error locking account: ${error.message}`);
  }
};

// 🔓 SELF-SERVICE UNLOCK REQUEST (Dispatches one-click unlock link to email)
exports.requestUnlock = async (req, res) => {
  try {
    const { email } = req.body;
    const deviceInfo = extractDeviceInfo(req);

    if (!email) {
      return res.status(400).json({ msg: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Don't leak user existence
      return res.json({ msg: "If your account is registered, an unlock link has been dispatched to your email." });
    }

    // Generate 15-minute unlock token
    const token = crypto.randomBytes(32).toString('hex');
    user.accountUnlockToken = token;
    user.accountUnlockExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const unlockLink = `${clientUrl}/unlock-account?token=${token}&email=${encodeURIComponent(user.email)}`;

    await sendUnlockAccountEmail(user, unlockLink);

    res.json({ msg: "If your account is registered, an unlock link has been dispatched to your email." });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔓 CONFIRM UNLOCK (Restores access via verified token)
exports.unlockAccount = async (req, res) => {
  try {
    const { token, email } = req.body;
    const deviceInfo = extractDeviceInfo(req);

    if (!token || !email) {
      return res.status(400).json({ msg: "Token and email are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (!user.accountUnlockToken || user.accountUnlockToken !== token) {
      return res.status(400).json({ msg: "Invalid or expired unlock token" });
    }

    if (user.accountUnlockExpires && user.accountUnlockExpires < Date.now()) {
      return res.status(400).json({ msg: "Unlock link has expired. Please request a new one." });
    }

    // Unlock account
    user.isLocked = false;
    user.lockUntil = null;
    user.lockReason = null;
    user.loginAttempts = 0;
    user.accountUnlockToken = null;
    user.accountUnlockExpires = null;
    await user.save();

    // 🛡️ Log ACCOUNT_UNLOCKED to Immutable Audit Trail
    await logAuditEvent({
      userId: user._id,
      userEmail: user.email,
      action: 'ACCOUNT_UNLOCKED',
      status: 'SUCCESS',
      riskLevel: 'LOW',
      deviceInfo,
      metadata: { method: "self_service_email_verification" }
    });

    // 🔗 Dispatch Outbound Webhook Event (user.unlocked)
    dispatchWebhookEvent('user.unlocked', {
      userId: user._id,
      email: user.email,
      unlockedAt: new Date().toISOString()
    }, user._id).catch(() => {});

    res.json({ msg: "Your account has been successfully unlocked! You may now sign in." });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

