const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const {
  getAllUsers,
  deleteUser,
  changeRole,
  unlockUser,
  getAdminAnalytics,
  impersonateUser,
  exitImpersonation,
  bulkUserAction,
  exportUsersCsv
} = require('../controllers/userController');

// 📊 Analytics & Forensics
router.get('/analytics', authMiddleware, roleMiddleware('admin'), getAdminAnalytics);

// 📦 Bulk User Operations & Forensics CSV
router.post('/bulk-action', authMiddleware, roleMiddleware('admin'), bulkUserAction);
router.get('/export-users-csv', authMiddleware, roleMiddleware('admin'), exportUsersCsv);

// 👤 User Impersonation ("Login as User")
router.post('/exit-impersonation', authMiddleware, exitImpersonation);
router.post('/:id/impersonate', authMiddleware, roleMiddleware('admin'), impersonateUser);

// 👥 Standard Admin User Management
router.get('/', authMiddleware, roleMiddleware('admin'), getAllUsers);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), deleteUser);
router.put('/:id/role', authMiddleware, roleMiddleware('admin'), changeRole);
router.put('/:id/unlock', authMiddleware, roleMiddleware('admin'), unlockUser);

module.exports = router;
