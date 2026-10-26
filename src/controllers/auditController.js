const AuditLog = require('../models/AuditLog');
const { getUserAuditLogs, getOrganizationAuditFeed } = require('../services/auditService');

/**
 * Get personal security history for the authenticated user
 */
exports.getMyLogs = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, action } = req.query;

    const result = await getUserAuditLogs(userId, req.user.email, { page, limit, action });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get organization-wide security feed (Admin only)
 */
exports.getAdminFeed = async (req, res) => {
  try {
    const {
      search = '',
      action = '',
      isSuspicious,
      status = '',
      riskLevel = '',
      page = 1,
      limit = 25
    } = req.query;

    const result = await getOrganizationAuditFeed({
      search,
      action,
      isSuspicious,
      status,
      riskLevel,
      page,
      limit
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Export organization-wide security audit logs as CSV
 */
exports.exportCsv = async (req, res) => {
  try {
    const { search = '', action = '', isSuspicious } = req.query;

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

    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(5000).lean();

    // Helper to safely escape CSV values
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = [
      'ID',
      'Timestamp (UTC)',
      'User Email',
      'Action',
      'Status',
      'Risk Level',
      'Suspicious',
      'IP Address',
      'Device',
      'Browser',
      'OS',
      'Location',
      'Metadata / Details'
    ];

    const rows = logs.map((log) => [
      escapeCsv(log._id),
      escapeCsv(new Date(log.createdAt).toISOString()),
      escapeCsv(log.userEmail),
      escapeCsv(log.action),
      escapeCsv(log.status),
      escapeCsv(log.riskLevel),
      escapeCsv(log.isSuspicious ? 'YES' : 'NO'),
      escapeCsv(log.ipAddress),
      escapeCsv(log.device),
      escapeCsv(log.browser),
      escapeCsv(log.os),
      escapeCsv(log.location),
      escapeCsv(log.metadata)
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const filename = `authx-security-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
