// src/routes/role.routes.js
// Role endpoints — read-only, all authenticated users can view roles

const router = require('express').Router();
const { authenticate }  = require('../middleware/auth');
const roleController    = require('../controllers/role.controller');

// GET /api/roles — all authenticated users
router.get('/',    authenticate, roleController.getAll);
router.get('/:id', authenticate, roleController.getById);

module.exports = router;
