const User = require('../models/User');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');
const ApiKey = require('../models/ApiKey');
const Webhook = require('../models/Webhook');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { logAuditEvent } = require('../services/auditService');
const { dispatchWebhookEvent } = require('../services/webhookService');

// 📋 GET ALL USERS
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🗑️ DELETE USER
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    await User.findByIdAndDelete(req.params.id);

    // 🔗 Dispatch Outbound Webhook Event (user.deleted)
    dispatchWebhookEvent('user.deleted', {
      userId: user._id,
      email: user.email,
      deletedAt: new Date().toISOString()
    }, user._id).catch(() => {});

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

// 👑 CHANGE ROLE
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

// 🔓 UNLOCK USER
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

    // 🔗 Dispatch Outbound Webhook Event (user.unlocked)
    dispatchWebhookEvent('user.unlocked', {
      userId: user._id,
      email: user.email,
      unlockedAt: new Date().toISOString()
    }, user._id).catch(() => {});

    res.json({ msg: `Account successfully unlocked for ${user.email}` });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// 📊 ENTERPRISE ADMIN SUITE (FEATURE 5)
// ==========================================

// 1. GET /api/users/analytics - Security & Auth Intelligence
exports.getAdminAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Total users, Active vs. Locked
    const totalUsers = await User.countDocuments();
    const lockedUsers = await User.countDocuments({
      $or: [
        { isLocked: true },
        { lockUntil: { $gt: now } }
      ]
    });
    const activeUsers = totalUsers - lockedUsers;
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const twoFactorUsers = await User.countDocuments({ twoFactorEnabled: true });

    // 2. Auth Method Ratios (OAuth vs Email/Password)
    const oauthUsers = await User.countDocuments({ googleId: { $exists: true, $ne: null } });
    const emailPasswordUsers = totalUsers - oauthUsers;
    const oauthRatio = totalUsers > 0 ? Math.round((oauthUsers / totalUsers) * 100) : 0;
    const emailPasswordRatio = totalUsers > 0 ? (100 - oauthRatio) : 0;

    // 3. Registration Velocity (24h, 48h-24h, and 7-day breakdown)
    const registrations24h = await User.countDocuments({ createdAt: { $gte: oneDayAgo } });
    const registrationsPrev24h = await User.countDocuments({ createdAt: { $gte: twoDaysAgo, $lt: oneDayAgo } });
    const registrations7d = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    // 7-day velocity series
    const velocity7d = [];
    for (let i = 6; i >= 0; i--) {
      const dStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0);
      const dEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59, 999);
      const count = await User.countDocuments({ createdAt: { $gte: dStart, $lte: dEnd } });
      const dayLabel = dStart.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      velocity7d.push({ date: dStart.toISOString().slice(0, 10), label: dayLabel, count });
    }

    // 4. Failed Login Attempts (24h, 7d and daily series from AuditLog)
    const failedLogins24h = await AuditLog.countDocuments({
      action: 'LOGIN_FAILED',
      timestamp: { $gte: oneDayAgo }
    });
    const failedLogins7d = await AuditLog.countDocuments({
      action: 'LOGIN_FAILED',
      timestamp: { $gte: sevenDaysAgo }
    });

    const failedLoginsSeries7d = [];
    for (let i = 6; i >= 0; i--) {
      const dStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0);
      const dEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59, 999);
      const count = await AuditLog.countDocuments({
        action: 'LOGIN_FAILED',
        timestamp: { $gte: dStart, $lte: dEnd }
      });
      const dayLabel = dStart.toLocaleDateString('en-US', { weekday: 'short' });
      failedLoginsSeries7d.push({ date: dStart.toISOString().slice(0, 10), label: dayLabel, count });
    }

    // 5. Active Infrastructure counts
    const activeSessions = await Session.countDocuments({ isRevoked: false, expiresAt: { $gt: now } });
    const activeApiKeys = await ApiKey.countDocuments({ isActive: true });
    const activeWebhooks = await Webhook.countDocuments({ isActive: true });

    res.json({
      overview: {
        totalUsers,
        activeUsers,
        lockedUsers,
        verifiedUsers,
        twoFactorUsers,
        twoFactorAdoptionPct: totalUsers > 0 ? Math.round((twoFactorUsers / totalUsers) * 100) : 0,
        activeSessions,
        activeApiKeys,
        activeWebhooks
      },
      registrationVelocity: {
        last24h: registrations24h,
        prev24h: registrationsPrev24h,
        last7d: registrations7d,
        dailySeries: velocity7d
      },
      authMethods: {
        oauthCount: oauthUsers,
        emailPasswordCount: emailPasswordUsers,
        oauthPct: oauthRatio,
        emailPasswordPct: emailPasswordRatio
      },
      failedLogins: {
        last24h: failedLogins24h,
        last7d: failedLogins7d,
        dailySeries: failedLoginsSeries7d
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. POST /api/users/:id/impersonate - User Impersonation ("Login as User")
exports.impersonateUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const adminUserId = req.user.userId;
    const adminEmail = req.user.email;

    if (targetUserId === adminUserId.toString()) {
      return res.status(400).json({ msg: "Cannot impersonate your own administrator account" });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ msg: "Target user not found" });
    }

    // Generate short-lived impersonation access token (1 hour)
    const impersonationToken = jwt.sign(
      {
        userId: targetUser._id,
        role: targetUser.role,
        isImpersonated: true,
        impersonatedBy: adminEmail,
        adminUserId: adminUserId
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '1h' }
    );

    // Create an explicit impersonation session
    const session = await Session.create({
      userId: targetUser._id,
      refreshToken: `imp_${crypto.randomBytes(32).toString('hex')}`,
      deviceType: 'Desktop',
      browser: 'Admin Impersonation Proxy',
      os: 'Admin Console',
      ipAddress: req.ip || '127.0.0.1',
      location: 'Administrative Session',
      expiresAt: new Date(Date.now() + 3600000)
    });

    // 🛡️ Log to Immutable Audit Trail
    await logAuditEvent({
      userId: targetUser._id,
      userEmail: targetUser.email,
      action: 'USER_IMPERSONATION_STARTED',
      status: 'WARNING',
      riskLevel: 'HIGH',
      req,
      metadata: {
        targetUserId: targetUser._id,
        targetEmail: targetUser.email,
        adminUserId,
        adminEmail,
        sessionId: session._id
      }
    });

    res.json({
      msg: `Impersonation session initiated for ${targetUser.email}`,
      impersonationToken,
      sessionId: session._id,
      targetUser: {
        _id: targetUser._id,
        email: targetUser.email,
        role: targetUser.role
      },
      impersonator: {
        _id: adminUserId,
        email: adminEmail
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. POST /api/users/exit-impersonation - End Impersonation Session
exports.exitImpersonation = async (req, res) => {
  try {
    const { sessionId, targetEmail } = req.body || {};

    if (sessionId) {
      await Session.findByIdAndUpdate(sessionId, { isRevoked: true });
    }

    // 🛡️ Log to Immutable Audit Trail
    await logAuditEvent({
      userId: req.user.userId,
      userEmail: req.user.email,
      action: 'USER_IMPERSONATION_ENDED',
      status: 'SUCCESS',
      riskLevel: 'LOW',
      req,
      metadata: {
        exitedBy: req.user.email,
        targetEmail: targetEmail || 'unknown'
      }
    });

    res.json({ msg: "Impersonation session exited successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. POST /api/users/bulk-action - Batch Lock, Unlock, Role Change, Delete
exports.bulkUserAction = async (req, res) => {
  try {
    const { action, userIds, role } = req.body;
    const adminUserId = req.user.userId.toString();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ msg: "Please provide an array of user IDs" });
    }

    // Prevent action on acting admin
    const targetIds = userIds.filter(id => id.toString() !== adminUserId);
    if (targetIds.length === 0) {
      return res.status(400).json({ msg: "Cannot perform bulk actions on your own administrator account" });
    }

    let affectedCount = 0;

    switch (action) {
      case 'lock': {
        const updateResult = await User.updateMany(
          { _id: { $in: targetIds } },
          { $set: { isLocked: true, lockReason: 'Bulk administrator lockdown' } }
        );
        // Revoke active sessions for locked users
        await Session.updateMany({ userId: { $in: targetIds } }, { $set: { isRevoked: true } });
        affectedCount = updateResult.modifiedCount;

        // Dispatch webhooks for locked users
        const lockedUsers = await User.find({ _id: { $in: targetIds } }, 'email');
        lockedUsers.forEach(u => {
          dispatchWebhookEvent('user.locked', { userId: u._id, email: u.email, reason: 'Bulk admin action' }, u._id).catch(() => {});
        });
        break;
      }
      case 'unlock': {
        const updateResult = await User.updateMany(
          { _id: { $in: targetIds } },
          { $set: { isLocked: false, lockUntil: null, lockReason: null, loginAttempts: 0 } }
        );
        affectedCount = updateResult.modifiedCount;

        // Dispatch webhooks for unlocked users
        const unlockedUsers = await User.find({ _id: { $in: targetIds } }, 'email');
        unlockedUsers.forEach(u => {
          dispatchWebhookEvent('user.unlocked', { userId: u._id, email: u.email }, u._id).catch(() => {});
        });
        break;
      }
      case 'changeRole': {
        const newRole = role === 'admin' ? 'admin' : 'user';
        const updateResult = await User.updateMany(
          { _id: { $in: targetIds } },
          { $set: { role: newRole } }
        );
        affectedCount = updateResult.modifiedCount;
        break;
      }
      case 'delete': {
        const deleteResult = await User.deleteMany({ _id: { $in: targetIds } });
        await Session.deleteMany({ userId: { $in: targetIds } });
        affectedCount = deleteResult.deletedCount;
        break;
      }
      default:
        return res.status(400).json({ msg: `Unsupported bulk action: ${action}` });
    }

    // 🛡️ Log to Immutable Audit Trail
    await logAuditEvent({
      userId: req.user.userId,
      userEmail: req.user.email,
      action: 'BULK_ACTION_EXECUTED',
      status: 'WARNING',
      riskLevel: 'HIGH',
      req,
      metadata: {
        action,
        count: affectedCount,
        role: action === 'changeRole' ? role : undefined,
        performedBy: req.user.email
      }
    });

    res.json({
      msg: `Bulk action '${action}' completed successfully on ${affectedCount} user(s)`,
      action,
      count: affectedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. GET /api/users/export-users-csv - Export User Directory as CSV
exports.exportUsersCsv = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    const headers = [
      'User ID',
      'Email',
      'Role',
      'Verified',
      'Security Status',
      'Auth Provider',
      '2FA Enabled',
      'Created At',
      'Last Updated'
    ];

    const rows = users.map(u => {
      const isLocked = u.isLocked || (u.lockUntil && new Date(u.lockUntil) > new Date());
      const authProvider = u.googleId ? 'Google OAuth' : 'Email/Password';
      return [
        `"${u._id}"`,
        `"${u.email}"`,
        `"${u.role}"`,
        u.isVerified ? 'VERIFIED' : 'UNVERIFIED',
        isLocked ? 'LOCKED' : 'ACTIVE',
        `"${authProvider}"`,
        u.twoFactorEnabled ? 'ENABLED' : 'DISABLED',
        `"${u.createdAt?.toISOString() || ''}"`,
        `"${u.updatedAt?.toISOString() || ''}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="authx-users-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
