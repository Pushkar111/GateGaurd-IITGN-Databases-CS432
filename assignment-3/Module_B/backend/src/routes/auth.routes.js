// src/routes/auth.routes.js
// Full Auth endpoints definitions mapping to controllers + Joi validation

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { authorize }    = require('../middleware/rbac');
const validate         = require('../middleware/validate');
const authController   = require('../controllers/auth.controller');
const { ROLES }        = require('../utils/constants');
const {
  loginSchema, refreshSchema, forgotPasswordSchema,
  verifyOTPSchema, resetPasswordSchema, changePasswordSchema,
  registerSchema
} = require('../validators/auth.validator');

// ── Public Auth ───────────────────────────────────────────────────────
router.post('/login',
  validate(loginSchema),
  authController.login
);

router.post('/refresh',
  validate(refreshSchema),
  authController.refresh
);

router.post('/forgot-password',
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

router.post('/verify-otp',
  validate(verifyOTPSchema),
  authController.verifyOtp
);

router.post('/reset-password',
  validate(resetPasswordSchema),
  authController.resetPassword
);

// ── Authenticated Auth ────────────────────────────────────────────────
router.post('/logout',
  authenticate,
  authController.logout
);

router.get('/me',
  authenticate,
  authController.getMe
);

router.post('/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

router.get('/login-history',
  authenticate,
  authController.getLoginHistory
);

// ── Admin Endpoints ───────────────────────────────────────────────────
router.post('/register',
  authenticate,
  authorize(ROLES.SUPERADMIN),
  validate(registerSchema),
  authController.register
);

module.exports = router;
