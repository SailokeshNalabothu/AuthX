const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const {
  getAllUsers,
  deleteUser,
  changeRole
} = require('../controllers/userController');

// Admin only routes
router.get('/', authMiddleware, roleMiddleware('admin'), getAllUsers);

router.delete('/:id', authMiddleware, roleMiddleware('admin'), deleteUser);

router.put('/:id/role', authMiddleware, roleMiddleware('admin'), changeRole);

module.exports = router;
