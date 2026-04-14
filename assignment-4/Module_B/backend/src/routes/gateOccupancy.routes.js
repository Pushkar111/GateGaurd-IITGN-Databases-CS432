// src/routes/gateOccupancy.routes.js
const router = require('express').Router();
const { authenticate }       = require('../middleware/auth');
const { authorize }          = require('../middleware/rbac');
const validate               = require('../middleware/validate');
const { updateOccupancySchema } = require('../validators/gate.validator');
const gateOccupancyController   = require('../controllers/gateOccupancy.controller');
const { ROLES }              = require('../utils/constants');

router.get('/',    authenticate, gateOccupancyController.getAll);
router.put('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.SUPERADMIN), validate(updateOccupancySchema), gateOccupancyController.updateOccupancy);

module.exports = router;
