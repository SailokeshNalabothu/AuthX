const Session = require('../models/Session');

// Get all active sessions for the logged-in user
exports.getUserSessions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const currentSessionId = req.headers['x-session-id'];

    const sessions = await Session.find({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    })
      .sort({ lastActiveAt: -1 })
      .select('-refreshToken'); // Don't leak raw refresh tokens

    const formattedSessions = sessions.map((session) => ({
      _id: session._id,
      deviceType: session.deviceType,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ipAddress,
      location: session.location,
      lastActiveAt: session.lastActiveAt,
      createdAt: session.createdAt,
      isCurrent: currentSessionId ? session._id.toString() === currentSessionId : false
    }));

    res.json({
      sessions: formattedSessions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Revoke a specific session / device
exports.revokeSession = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const session = await Session.findOne({ _id: id, userId });
    if (!session) {
      return res.status(404).json({ msg: "Session not found or already removed" });
    }

    session.isRevoked = true;
    await session.save();

    res.json({ msg: "Device session revoked successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Revoke all sessions except the current one
exports.revokeOtherSessions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentSessionId } = req.body;

    if (!currentSessionId) {
      return res.status(400).json({ msg: "Current session ID is required" });
    }

    await Session.updateMany(
      {
        userId,
        _id: { $ne: currentSessionId },
        isRevoked: false
      },
      {
        $set: { isRevoked: true }
      }
    );

    res.json({ msg: "Signed out of all other devices successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
