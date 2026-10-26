const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ msg: "No token provided" });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ msg: "Invalid token format" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // 🛡️ Real-time Session Revocation Check:
    // If client passes x-session-id, verify the session was not revoked from another device
    const sessionId = req.headers['x-session-id'];
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
