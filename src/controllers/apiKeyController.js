const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');
const User = require('../models/User');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');
const { logAuditEvent } = require('../services/auditService');
const { extractDeviceInfo } = require('../utils/deviceParser');

const VALID_SCOPES = [
  'read:profile',
  'write:users',
  'read:users',
  'read:sessions',
  'write:sessions',
  'read:audit'
];

// 🔑 CREATE SCOPED API KEY (PERSONAL ACCESS TOKEN)
exports.createApiKey = async (req, res) => {
  try {
    const { name, scopes = ['read:profile'], expiresInDays = null } = req.body;
    const userId = req.user?.userId;
    const deviceInfo = extractDeviceInfo(req);

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ msg: "API key name is required" });
    }

    // Validate scopes
    if (!Array.isArray(scopes) || scopes.length === 0) {
      return res.status(400).json({ msg: "At least one valid scope is required" });
    }

    const invalidScopes = scopes.filter(s => !VALID_SCOPES.includes(s));
    if (invalidScopes.length > 0) {
      return res.status(400).json({
        msg: `Invalid scopes: ${invalidScopes.join(', ')}. Allowed scopes: ${VALID_SCOPES.join(', ')}`
      });
    }

    // Expiration calculation
    let expiresAt = null;
    if (expiresInDays && Number(expiresInDays) > 0) {
      expiresAt = new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000);
    }

    // Generate secret key (Stripe style authx_live_sk_...)
    const entropy = crypto.randomBytes(24).toString('hex');
    const rawKey = `authx_live_sk_${entropy}`;

    // SHA-256 hash for secure storage
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = `${rawKey.substring(0, 18)}...${rawKey.substring(rawKey.length - 4)}`;

    const apiKey = await ApiKey.create({
      userId,
      name: name.trim(),
      keyPrefix,
      keyHash,
      scopes,
      expiresAt
    });

    // 🛡️ Log to Immutable Audit Trail
    await logAuditEvent({
      userId,
      userEmail: req.user?.email || 'unknown',
      action: 'API_KEY_CREATED',
      status: 'SUCCESS',
      riskLevel: 'LOW',
      deviceInfo,
      metadata: {
        keyId: apiKey._id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt
      }
    });

    res.status(201).json({
      msg: "API key created successfully. Save this key now—it will never be displayed again.",
      apiKey: {
        id: apiKey._id,
        name: apiKey.name,
        rawKey, // Only returned once!
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📋 LIST USER'S API KEYS
exports.listApiKeys = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const keys = await ApiKey.find({ userId }).sort({ createdAt: -1 });

    const sanitizedKeys = keys.map(k => ({
      id: k._id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      scopes: k.scopes,
      expiresAt: k.expiresAt,
      lastUsedAt: k.lastUsedAt,
      isActive: k.isActive,
      isExpired: k.expiresAt ? new Date(k.expiresAt) < new Date() : false,
      createdAt: k.createdAt
    }));

    res.json({
      keys: sanitizedKeys,
      count: sanitizedKeys.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🛑 REVOKE API KEY
exports.revokeApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const deviceInfo = extractDeviceInfo(req);

    const apiKey = await ApiKey.findOne({ _id: id, userId });
    if (!apiKey) {
      return res.status(404).json({ msg: "API key not found" });
    }

    apiKey.isActive = false;
    await apiKey.save();

    // 🛡️ Log to Immutable Audit Trail
    await logAuditEvent({
      userId,
      userEmail: req.user?.email || 'unknown',
      action: 'API_KEY_REVOKED',
      status: 'SUCCESS',
      riskLevel: 'MEDIUM',
      deviceInfo,
      metadata: {
        keyId: apiKey._id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix
      }
    });

    res.json({ msg: "API key revoked successfully", keyId: apiKey._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🗑️ DELETE API KEY PERMANENTLY
exports.deleteApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const apiKey = await ApiKey.findOneAndDelete({ _id: id, userId });
    if (!apiKey) {
      return res.status(404).json({ msg: "API key not found" });
    }

    res.json({ msg: "API key permanently deleted", keyId: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// ⚡ DEVELOPER V1 PROTECTED API ENDPOINTS
// Accessible via Scoped API Keys (PATs) or JWT
// ==========================================

// 1. GET /api/developer/v1/profile (Scope: read:profile)
exports.getDeveloperProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      '-password -otp -accountLockToken -accountUnlockToken -refreshToken -twoFactorSecret -twoFactorTempSecret -twoFactorBackupCodes'
    );
    if (!user) {
      return res.status(404).json({ msg: "User profile not found" });
    }
    res.json({
      authType: req.apiKey ? "API_KEY" : "SESSION_TOKEN",
      scopesGranted: req.apiKey ? req.apiKey.scopes : ["*"],
      profile: user
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. GET /api/developer/v1/users (Scope: read:users or write:users)
exports.getDeveloperUsers = async (req, res) => {
  try {
    const users = await User.find({}, 'email role isVerified isLocked createdAt');
    res.json({
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. GET /api/developer/v1/sessions (Scope: read:sessions)
exports.getDeveloperSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user.userId, isRevoked: false });
    res.json({
      count: sessions.length,
      sessions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. GET /api/developer/v1/audit-events (Scope: read:audit)
exports.getDeveloperAuditEvents = async (req, res) => {
  try {
    const events = await AuditLog.find({ userId: req.user.userId }).sort({ timestamp: -1 }).limit(50);
    res.json({
      count: events.length,
      events
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
