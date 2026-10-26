const express = require('express');
const router = express.Router();

const { signup, verifyOTP, login, login2FA, forgotPassword, resetPassword, refreshTokenHandler } = require('../controllers/authController');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 10,
  message: {
    msg: "Too many login attempts, try again later"
  }
});

router.post('/signup', signup);
router.post('/verify-otp', verifyOTP);
router.post('/login', loginLimiter, login);
router.post('/login-2fa', loginLimiter, login2FA);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/refresh', refreshTokenHandler);

const passport = require('passport');

// Start Google login
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const sessionParam = req.user.sessionId ? `&sessionId=${req.user.sessionId}` : '';
    res.redirect(`${clientUrl}/google-success?accessToken=${req.user.accessToken}&refreshToken=${req.user.refreshToken}${sessionParam}`);
  }
);

module.exports = router;
