// src/routes/user.routes.js
// User management endpoints — Admin and SuperAdmin only

const router = require('express').Router();
const { authenticate }    = require('../middleware/auth');
const { authorize }       = require('../middleware/rbac');
const validate            = require('../middleware/validate');
const { createUserSchema, updateUserSchema } = require('../validators/user.validator');
const userController      = require('../controllers/user.controller');
const { ROLES }           = require('../utils/constants');

// GET /api/users — Admin and SuperAdmin can list all users
router.get('/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPERADMIN),
  userController.getAll
);

// POST /api/users
// - SuperAdmin: direct create
// - Admin: create pending approval request
router.post('/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPERADMIN),
  validate(createUserSchema),
  userController.create
);

// GET /api/users/requests/pending — SuperAdmin only
router.get('/requests/pending',
  authenticate,
  authorize(ROLES.SUPERADMIN),
  userController.getPendingRequests
);

// POST /api/users/requests/:id/approve — SuperAdmin only
router.post('/requests/:id/approve',
  authenticate,
  authorize(ROLES.SUPERADMIN),
  userController.approveRequest
);

// POST /api/users/requests/:id/reject — SuperAdmin only
router.post('/requests/:id/reject',
  authenticate,
  authorize(ROLES.SUPERADMIN),
  userController.rejectRequest
);

// GET /api/users/:id
router.get('/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPERADMIN),
  userController.getById
);

// PUT /api/users/:id
// - SuperAdmin: can update any user fields
// - Admin/Guard: can update only their own password (enforced in service)
router.put('/:id',
  authenticate,
  authorize(ROLES.GUARD, ROLES.ADMIN, ROLES.SUPERADMIN),
  validate(updateUserSchema),
  userController.update
);

// DELETE /api/users/:id — SuperAdmin only
router.delete('/:id',
  authenticate,
  authorize(ROLES.SUPERADMIN),
  userController.delete
);

module.exports = router;
