const express = require('express');
const rateLimit = require('express-rate-limit');
const { staffLogin, studentLogin, changePassword, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Slow down credential-guessing attempts on login endpoints specifically.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

router.post('/staff-login', loginLimiter, staffLogin);
router.post('/student-login', loginLimiter, studentLogin);
router.post('/change-password', requireAuth, changePassword);
router.get('/me', requireAuth, me);

module.exports = router;
