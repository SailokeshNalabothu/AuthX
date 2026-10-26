const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getUserSessions,
  revokeSession,
  revokeOtherSessions
} = require('../controllers/sessionController');

// All session routes require user authentication
router.use(authMiddleware);

router.get('/', getUserSessions);
router.delete('/:id', revokeSession);
router.post('/revoke-others', revokeOtherSessions);

module.exports = router;
