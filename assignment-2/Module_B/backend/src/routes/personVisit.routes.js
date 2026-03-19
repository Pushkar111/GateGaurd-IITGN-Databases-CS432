// src/routes/personVisit.routes.js
const router = require('express').Router();
const { authenticate }  = require('../middleware/auth');
const { authorize }     = require('../middleware/rbac');
const validate          = require('../middleware/validate');
const { recordEntrySchema, recordExitSchema } = require('../validators/personVisit.validator');
const pvController      = require('../controllers/personVisit.controller');
const { ROLES }         = require('../utils/constants');

router.get('/',    authenticate, pvController.getAll);
router.get('/:id', authenticate, pvController.getById);
// all authenticated users can record entry/exit (Guard included)
router.post('/entry',     authenticate, validate(recordEntrySchema), pvController.recordEntry);
router.put('/:id/exit',    authenticate, validate(recordExitSchema),  pvController.recordExit);
router.delete('/:id',      authenticate, authorize(ROLES.SUPERADMIN), pvController.delete);

module.exports = router;
