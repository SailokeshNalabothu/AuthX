const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  get2FAStatus,
  setup2FA,
  verifyAndEnable2FA,
  disable2FA,
  regenerateBackupCodes
} = require('../controllers/twoFactorController');

// All 2FA management routes require user to be logged in
router.use(authMiddleware);

router.get('/status', get2FAStatus);
router.post('/setup', setup2FA);
router.post('/verify', verifyAndEnable2FA);
router.post('/disable', disable2FA);
router.post('/regenerate-backup-codes', regenerateBackupCodes);

module.exports = router;
