const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

/**
 * Middleware that strictly authenticates requests using Scoped API Keys (Personal Access Tokens).
 */
const apiKeyAuth = async (req, res, next) => {
  try {
    let rawKey = req.headers['x-api-key'];

    const authHeader = req.headers.authorization;
    if (!rawKey && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token.startsWith('authx_live_sk_') || token.startsWith('authx_test_sk_')) {
        rawKey = token;
      }
    }

    if (!rawKey) {
      return res.status(401).json({ msg: "API key is required. Pass via 'x-api-key' header or 'Authorization: Bearer authx_live_sk_...'" });
    }

    // Cryptographic hash comparison
    const keyHash = crypto.createHash('sha256').update(rawKey.trim()).digest('hex');

    const apiKey = await ApiKey.findOne({ keyHash, isActive: true });
    if (!apiKey) {
      return res.status(401).json({ msg: "Invalid or revoked API key" });
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return res.status(401).json({ msg: "API key has expired" });
    }

    const user = await User.findById(apiKey.userId).select('email role isLocked lockUntil');
    if (!user) {
      return res.status(401).json({ msg: "User associated with this API key no longer exists" });
    }

    if (user.isLocked || (user.lockUntil && user.lockUntil > Date.now())) {
      return res.status(403).json({ msg: "Account associated with this API key is locked" });
    }

    // Update last used asynchronously
    ApiKey.updateOne({ _id: apiKey._id }, { $set: { lastUsedAt: new Date() } }).exec();

    req.apiKey = apiKey;
    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
      scopes: apiKey.scopes,
      isApiKey: true
    };

    next();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Flexible middleware: Accepts EITHER JWT Bearer token OR Scoped API Key.
 */
const flexibleAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'];

  const isApiKeyFormat = apiKeyHeader || (authHeader && (authHeader.includes('authx_live_sk_') || authHeader.includes('authx_test_sk_')));

  if (isApiKeyFormat) {
    return apiKeyAuth(req, res, next);
  }

  // Fallback to standard JWT auth
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ msg: "No authorization credentials provided" });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const sessionId = req.headers['x-session-id'];
    if (sessionId) {
      const session = await Session.findById(sessionId);
      if (session && session.isRevoked) {
        return res.status(401).json({ msg: "Session has been revoked" });
      }
    }

    req.user = decoded;

    if (decoded.userId) {
      const user = await User.findById(decoded.userId).select('email role isLocked lockUntil');
      if (user) {
        if (user.isLocked || (user.lockUntil && user.lockUntil > Date.now())) {
          return res.status(403).json({ msg: "Account is locked" });
        }
        req.user.email = user.email;
        req.user.role = user.role;
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
};

/**
 * Scope Guard: Validates that an API key possesses the required scope.
 * (Passes automatically for session-authenticated interactive JWT users).
 */
const requireScope = (scope) => {
  return (req, res, next) => {
    if (req.apiKey) {
      const hasScope = req.apiKey.scopes.includes(scope) || req.apiKey.scopes.includes('*');
      if (!hasScope) {
        return res.status(403).json({
          msg: `Forbidden: API key lacks required scope '${scope}'. Permitted scopes: ${req.apiKey.scopes.join(', ')}`
        });
      }
    }
    next();
  };
};

module.exports = {
  apiKeyAuth,
  flexibleAuth,
  requireScope
};
