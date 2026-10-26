const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check httpOnly Cookie (Hardened against XSS token theft)
    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    // 2. Fallback to Authorization Header (for API clients, Supertest, cURL)
    if (!token && req.headers.authorization) {
      if (req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
      } else {
        return res.status(401).json({ msg: "Invalid token format" });
      }
    }

    if (!token) {
      return res.status(401).json({ msg: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // 🛡️ Real-time Session Revocation Check:
    // Support either x-session-id header or cookie
    const sessionId = req.headers['x-session-id'] || (req.cookies ? req.cookies.sessionId : null);
    if (sessionId) {
      const session = await Session.findById(sessionId);
      if (session && session.isRevoked) {
        return res.status(401).json({ msg: "Session has been revoked" });
      }
    }

    req.user = decoded;

    // 🛡️ Account Lock Check:
    if (decoded.userId) {
      const user = await User.findById(decoded.userId).select('email isLocked lockUntil');
      if (user) {
        if (user.isLocked || (user.lockUntil && user.lockUntil > Date.now())) {
          return res.status(403).json({ msg: "Account is locked. Please contact support or an administrator." });
        }
        req.user.email = user.email;
      }
    }

    next();

  } catch (error) {
    return res.status(401).json({ msg: "Invalid token" });
  }
};

module.exports = authMiddleware;
