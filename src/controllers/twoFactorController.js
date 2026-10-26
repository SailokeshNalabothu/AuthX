const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { logAuditEvent } = require('../services/auditService');

// 1. Get 2FA Status
exports.get2FAStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const remainingBackupCodes = user.twoFactorBackupCodes
      ? user.twoFactorBackupCodes.filter(c => !c.used).length
      : 0;

    res.json({
      enabled: !!user.twoFactorEnabled,
      remainingBackupCodes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Setup 2FA - Generate Secret & QR Code
exports.setup2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.twoFactorEnabled) {
      return res.status(400).json({ msg: "2FA is already enabled on your account" });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      length: 20,
      name: `AuthX (${user.email})`,
      issuer: "AuthX Identity"
    });

    // Store temporary secret until verified
    user.twoFactorTempSecret = secret.base32;
    await user.save();

    // Generate QR Code data URL
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCodeUrl
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Verify & Enable 2FA - Confirm with first code and issue backup codes
exports.verifyAndEnable2FA = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ msg: "Verification code is required" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (!user.twoFactorTempSecret) {
      return res.status(400).json({ msg: "Please initiate 2FA setup first" });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorTempSecret,
      encoding: 'base32',
      token: code.trim(),
      window: 1 // allow 30s clock skew
    });

    if (!verified) {
      return res.status(400).json({ msg: "Invalid 6-digit code. Please try again." });
    }

    // Generate 8 Emergency Single-Use Backup Codes (format: XXXX-XXXX)
    const rawBackupCodes = [];
    const hashedBackupCodes = [];

    for (let i = 0; i < 8; i++) {
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const rawCode = `${part1}-${part2}`;
      rawBackupCodes.push(rawCode);

      const hash = await bcrypt.hash(rawCode, 8);
      hashedBackupCodes.push({ codeHash: hash, used: false });
    }

    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorTempSecret = null;
    user.twoFactorEnabled = true;
    user.twoFactorBackupCodes = hashedBackupCodes;

    await user.save();

    // 🛡️ Log 2FA_ENABLED to Immutable Security Audit Trail
    await logAuditEvent({
      userId: user._id,
      userEmail: user.email,
      action: '2FA_ENABLED',
      status: 'SUCCESS',
      riskLevel: 'LOW',
      req,
      metadata: { method: 'authenticator_app_totp', backupCodesCount: 8 }
    });

    res.json({
      msg: "2FA successfully enabled!",
      backupCodes: rawBackupCodes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Disable 2FA - Requires user password for verification
exports.disable2FA = async (req, res) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.password) {
      if (!password) {
        return res.status(400).json({ msg: "Password is required to disable 2FA" });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: "Incorrect password" });
      }
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorTempSecret = null;
    user.twoFactorBackupCodes = [];
    await user.save();

    // 🛡️ Log 2FA_DISABLED to Immutable Security Audit Trail
    await logAuditEvent({
      userId: user._id,
      userEmail: user.email,
      action: '2FA_DISABLED',
      status: 'WARNING',
      riskLevel: 'MEDIUM',
      req,
      metadata: { reason: "User requested 2FA deactivation" }
    });

    res.json({ msg: "Two-Factor Authentication disabled successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. Regenerate Backup Codes - Requires password confirmation
exports.regenerateBackupCodes = async (req, res) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ msg: "Two-Factor Authentication is not enabled" });
    }

    if (user.password) {
      if (!password) {
        return res.status(400).json({ msg: "Password is required to regenerate backup codes" });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: "Incorrect password" });
      }
    }

    // Generate 8 new Emergency Single-Use Backup Codes (format: XXXX-XXXX)
    const rawBackupCodes = [];
    const hashedBackupCodes = [];

    for (let i = 0; i < 8; i++) {
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const rawCode = `${part1}-${part2}`;
      rawBackupCodes.push(rawCode);

      const hash = await bcrypt.hash(rawCode, 8);
      hashedBackupCodes.push({ codeHash: hash, used: false });
    }

    user.twoFactorBackupCodes = hashedBackupCodes;
    await user.save();

    res.json({
      msg: "New backup codes generated successfully",
      backupCodes: rawBackupCodes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
