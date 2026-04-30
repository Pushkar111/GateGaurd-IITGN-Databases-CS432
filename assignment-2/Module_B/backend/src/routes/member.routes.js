// src/routes/member.routes.js
const router = require('express').Router();
const { authenticate }   = require('../middleware/auth');
const { authorize }      = require('../middleware/rbac');
const validate           = require('../middleware/validate');
const { createMemberSchema, updateMemberSchema } = require('../validators/member.validator');
const memberController   = require('../controllers/member.controller');
const { ROLES }          = require('../utils/constants');

router.get('/',    authenticate, memberController.getAll);
router.get('/types', authenticate, memberController.getTypes);
router.get('/:id', authenticate, memberController.getById);
router.post('/',   authenticate, authorize(ROLES.GUARD, ROLES.ADMIN, ROLES.SUPERADMIN), validate(createMemberSchema), memberController.create);
router.put('/:id', authenticate, authorize(ROLES.GUARD, ROLES.ADMIN, ROLES.SUPERADMIN), validate(updateMemberSchema), memberController.update);
router.delete('/:id', authenticate, authorize(ROLES.GUARD, ROLES.ADMIN, ROLES.SUPERADMIN), memberController.delete);

module.exports = router;
