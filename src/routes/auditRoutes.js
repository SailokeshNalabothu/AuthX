const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// User routes (personal security timeline)
router.get('/my-logs', authMiddleware, auditController.getMyLogs);

// Admin routes (organization-wide security feed & CSV export)
router.get('/admin-feed', authMiddleware, roleMiddleware('admin'), auditController.getAdminFeed);
router.get('/export-csv', authMiddleware, roleMiddleware('admin'), auditController.exportCsv);

module.exports = router;
