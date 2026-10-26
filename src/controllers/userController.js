const User = require('../models/User');
const { logAuditEvent } = require('../services/auditService');

// GET ALL USERS
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE USER
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    await User.findByIdAndDelete(req.params.id);

    await logAuditEvent({
      userId: user._id,
      userEmail: user.email,
      action: 'ROLE_CHANGED',
      status: 'WARNING',
      req,
      metadata: { actionDetail: "User deleted by admin", deletedBy: req.user?.email || 'admin' }
    });

    res.json({ msg: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CHANGE ROLE
exports.changeRole = async (req, res) => {
  try {
    const { role } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    // 🛡️ Log ROLE_CHANGED to Immutable Security Audit Trail
    await logAuditEvent({
      userId: user._id,
      userEmail: user.email,
      action: 'ROLE_CHANGED',
      status: 'WARNING',
      riskLevel: 'MEDIUM',
      req,
      metadata: {
        targetUserId: user._id,
        targetEmail: user.email,
        oldRole,
        newRole: role,
        changedBy: req.user?.email || 'admin'
      }
    });

    res.json({ msg: "User role updated" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UNLOCK USER
exports.unlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    user.isLocked = false;
    user.lockUntil = null;
    user.lockReason = null;
    user.loginAttempts = 0;
    user.accountLockToken = null;
    user.accountLockExpires = null;
    await user.save();

    // 🛡️ Log ACCOUNT_UNLOCKED
    await logAuditEvent({
      userId: user._id,
      userEmail: user.email,
      action: 'ACCOUNT_UNLOCKED',
      status: 'SUCCESS',
      riskLevel: 'LOW',
      req,
      metadata: {
        targetUserId: user._id,
        targetEmail: user.email,
        unlockedBy: req.user?.email || 'admin'
      }
    });

    res.json({ msg: `Account successfully unlocked for ${user.email}` });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
