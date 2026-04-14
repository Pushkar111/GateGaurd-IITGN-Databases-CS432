// src/routes/vehicle.routes.js
const router = require('express').Router();
const { authenticate }  = require('../middleware/auth');
const { authorize }     = require('../middleware/rbac');
const validate          = require('../middleware/validate');
const { createVehicleSchema, updateVehicleSchema } = require('../validators/vehicle.validator');
const vehicleController = require('../controllers/vehicle.controller');
const { ROLES }         = require('../utils/constants');

router.get('/',    authenticate, vehicleController.getAll);
router.get('/types', authenticate, vehicleController.getTypes);
router.get('/:id', authenticate, vehicleController.getById);
router.post('/',   authenticate, authorize(ROLES.GUARD, ROLES.ADMIN, ROLES.SUPERADMIN), validate(createVehicleSchema), vehicleController.create);
router.put('/:id', authenticate, authorize(ROLES.GUARD, ROLES.ADMIN, ROLES.SUPERADMIN), validate(updateVehicleSchema), vehicleController.update);
router.delete('/:id', authenticate, authorize(ROLES.GUARD, ROLES.ADMIN, ROLES.SUPERADMIN), vehicleController.delete);

module.exports = router;
