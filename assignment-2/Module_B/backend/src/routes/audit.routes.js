// src/routes/audit.routes.js
// READ ONLY — the actual writing to audit log happens via writeAuditRecord() helper
// no POST/PUT/DELETE endpoints here — audit records must never be mutated via the API
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { authorize }    = require('../middleware/rbac');
const auditController  = require('../controllers/audit.controller');
const { ROLES }        = require('../utils/constants');

router.get('/',    authenticate, authorize(ROLES.ADMIN, ROLES.SUPERADMIN), auditController.getAll);
router.get('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.SUPERADMIN), auditController.getById);

module.exports = router;
