const AuditLog = require('../models/AuditLog');
const { extractDeviceInfo } = require('../utils/deviceParser');

/**
 * Log an immutable security audit event
 */
const logAuditEvent = async ({
  userId = null,
  userEmail,
  action,
  status = 'SUCCESS',
  req = null,
  deviceInfo = null,
  isSuspicious = false,
  riskLevel = 'LOW',
  metadata = {}
}) => {
  try {
    let resolvedDevice = {
      device: 'Unknown Device',
      browser: 'Unknown Browser',
      os: 'Unknown OS',
      deviceType: 'Desktop',
      ipAddress: '127.0.0.1',
      location: 'Local Development'
    };

    if (deviceInfo) {
      resolvedDevice = { ...resolvedDevice, ...deviceInfo };
    } else if (req) {
      resolvedDevice = extractDeviceInfo(req);
    }

    // Determine default risk level based on action and status
    let computedRisk = riskLevel;
    if (isSuspicious) {
      computedRisk = 'HIGH';
    } else if (action === 'FAILED_ATTEMPT_LOCKED' || action === 'ACCOUNT_LOCKED') {
      computedRisk = 'CRITICAL';
    } else if (action === 'LOGIN_FAILED') {
      computedRisk = 'MEDIUM';
    }

    const logEntry = await AuditLog.create({
      userId: userId || null,
      userEmail: userEmail ? userEmail.toLowerCase().trim() : 'anonymous',
      action,
      status,
      device: resolvedDevice.device || `${resolvedDevice.browser} on ${resolvedDevice.os}`,
      browser: resolvedDevice.browser,
      os: resolvedDevice.os,
      deviceType: resolvedDevice.deviceType,
      ipAddress: resolvedDevice.ipAddress,
      location: resolvedDevice.location,
      isSuspicious,
      riskLevel: computedRisk,
      metadata
    });

    console.log(`🛡️ [AUDIT] ${action} | ${userEmail} | ${resolvedDevice.ipAddress} | Suspicious: ${isSuspicious}`);
    return logEntry;
  } catch (error) {
    console.error("❌ Failed to record security audit log:", error.message);
    return null;
  }
};

/**
 * Retrieve personal security history for a specific user
 */
const getUserAuditLogs = async (userId, userEmail, { page = 1, limit = 20, action = null } = {}) => {
  const query = {
    $or: [
      ...(userId ? [{ userId }] : []),
      ...(userEmail ? [{ userEmail: userEmail.toLowerCase().trim() }] : [])
    ]
  };

  if (action && action !== 'ALL') {
    query.action = action;
  }

  const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  const total = await AuditLog.countDocuments(query);
  const logs = await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  return {
    logs,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)) || 1
  };
};

/**
 * Organization-wide audit feed for Admins with search and filters
 */
const getOrganizationAuditFeed = async ({
  search = '',
  action = '',
  isSuspicious = null,
  status = '',
  riskLevel = '',
  page = 1,
  limit = 25
} = {}) => {
  const query = {};

  if (search && search.trim()) {
    const s = search.trim();
    query.$or = [
      { userEmail: { $regex: s, $options: 'i' } },
      { ipAddress: { $regex: s, $options: 'i' } },
      { location: { $regex: s, $options: 'i' } },
      { device: { $regex: s, $options: 'i' } }
    ];
  }

  if (action && action !== 'ALL') {
    query.action = action;
  }

  if (isSuspicious === 'true' || isSuspicious === true) {
    query.isSuspicious = true;
  }

  if (status && status !== 'ALL') {
    query.status = status;
  }

  if (riskLevel && riskLevel !== 'ALL') {
    query.riskLevel = riskLevel;
  }

  const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  const total = await AuditLog.countDocuments(query);
  const logs = await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  // Aggregate high-level stats for the admin dashboard cards
  const [totalAlerts, suspiciousCount, lockedCount] = await Promise.all([
    AuditLog.countDocuments({ status: 'ALERT' }),
    AuditLog.countDocuments({ isSuspicious: true }),
    AuditLog.countDocuments({ action: { $in: ['FAILED_ATTEMPT_LOCKED', 'ACCOUNT_LOCKED'] } })
  ]);

  return {
    logs,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)) || 1,
    stats: {
      totalEvents: total,
      totalAlerts,
      suspiciousCount,
      lockedCount
    }
  };
};

module.exports = {
  logAuditEvent,
  getUserAuditLogs,
  getOrganizationAuditFeed
};
