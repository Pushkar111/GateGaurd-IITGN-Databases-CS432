// src/routes/gate.routes.js
const router = require('express').Router();
const { authenticate }  = require('../middleware/auth');
const { authorize }     = require('../middleware/rbac');
const validate          = require('../middleware/validate');
const { createGateSchema, updateGateSchema } = require('../validators/gate.validator');
const gateController    = require('../controllers/gate.controller');
const { ROLES }         = require('../utils/constants');

router.get('/',    authenticate, gateController.getAll);
router.get('/:id', authenticate, gateController.getById);
router.post('/',   authenticate, authorize(ROLES.SUPERADMIN), validate(createGateSchema), gateController.create);
router.put('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.SUPERADMIN), validate(updateGateSchema), gateController.update);
router.delete('/:id', authenticate, authorize(ROLES.SUPERADMIN), gateController.delete);

module.exports = router;
