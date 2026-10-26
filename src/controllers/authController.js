const User = require('../models/User');
const Session = require('../models/Session');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const generateOTP = require('../utils/generateOTP');
const { parseUserAgent, getClientIp, getLocationFromIp } = require('../utils/deviceParser');
const { sendOTPEmail, sendWelcomeEmail, sendResetPasswordEmail } = require('../services/emailService');

exports.signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔥 Generate OTP
    const otp = generateOTP();

    const user = await User.create({
      email,
      password: hashedPassword,
      otp,
      otpExpiry: Date.now() + 5 * 60 * 1000 // 5 min
    });

    // 📩 Send OTP Email
    await sendOTPEmail(user, otp);
    console.log(`🔑 [DEV MODE] Generated OTP for ${user.email}: ${otp}`);

    const userResponse = {
      _id: user._id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    };

    res.status(201).json({
      msg: "User created. OTP sent to email",
      user: userResponse,
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otp })
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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

    await user.save();

    // 📩 Send Welcome Email
    await sendWelcomeEmail(user);

    res.json({ msg: "Account verified successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }

    // 2. Check if verified
    if (!user.isVerified) {
      return res.status(400).json({ msg: "Please verify your account first" });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(403).json({
        msg: "Account locked. Try again later"
      });
    }

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.loginAttempts += 1;

      // Lock after 5 attempts
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000; // 15 min
        user.loginAttempts = 0;
      }

      await user.save();

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
    const userAgentHeader = req.headers['user-agent'] || '';
    const { deviceType, os, browser } = parseUserAgent(userAgentHeader);
    const ipAddress = getClientIp(req);
    const location = getLocationFromIp(ipAddress);

    const session = await Session.create({
      userId: user._id,
      refreshToken,
      deviceType,
      browser,
      os,
      ipAddress,
      location,
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    res.json({
      msg: "Login successful",
      accessToken,
      refreshToken,
      sessionId: session._id
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 min

    await user.save();

    const resetLink = `http://localhost:5000/api/auth/reset-password/${token}`;

    await sendResetPasswordEmail(user, resetLink);

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

    // Clear reset fields
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

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

    if (!tempToken || !code) {
      return res.status(400).json({ msg: "Authentication challenge token and code are required" });
    }

    const speakeasy = require('speakeasy');
    const bcrypt = require('bcryptjs');

    const decoded = jwt.verify(tempToken, process.env.ACCESS_TOKEN_SECRET);
    if (!decoded.require2FA) {
      return res.status(400).json({ msg: "Invalid 2FA challenge token" });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ msg: "2FA is not active on this account" });
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
      return res.status(400).json({ msg: "Invalid 6-digit authenticator code" });
    }

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

    const userAgentHeader = req.headers['user-agent'] || '';
    const { deviceType, os, browser } = parseUserAgent(userAgentHeader);
    const ipAddress = getClientIp(req);
    const location = getLocationFromIp(ipAddress);

    const session = await Session.create({
      userId: user._id,
      refreshToken,
      deviceType,
      browser,
      os,
      ipAddress,
      location,
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    res.json({
      msg: "Login successful with 2FA",
      accessToken,
      refreshToken,
      sessionId: session._id
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: "2FA challenge session expired. Please log in again." });
    }
    res.status(500).json({ error: error.message });
  }
};
