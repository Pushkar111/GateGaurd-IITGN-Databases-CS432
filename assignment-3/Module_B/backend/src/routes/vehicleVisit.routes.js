// src/routes/vehicleVisit.routes.js
const router = require('express').Router();
const { authenticate }  = require('../middleware/auth');
const { authorize }     = require('../middleware/rbac');
const validate          = require('../middleware/validate');
const { recordEntrySchema, recordExitSchema } = require('../validators/vehicleVisit.validator');
const vvController      = require('../controllers/vehicleVisit.controller');
const { ROLES }         = require('../utils/constants');

router.get('/',    authenticate, vvController.getAll);
router.get('/:id', authenticate, vvController.getById);
router.post('/entry',   authenticate, validate(recordEntrySchema), vvController.recordEntry);
router.put('/:id/exit',  authenticate, validate(recordExitSchema),  vvController.recordExit);
router.delete('/:id',    authenticate, authorize(ROLES.SUPERADMIN), vvController.delete);

module.exports = router;
