// src/validators/vehicle.validator.js
const Joi = require('joi');

const createVehicleSchema = Joi.object({
  registrationNumber: Joi.string().trim().uppercase().max(20).required().messages({
    'any.required': 'Registration number is required',
    'string.max':   'Registration number cannot exceed 20 characters',
  }),
  ownerId: Joi.number().integer().positive().required().messages({ 'any.required': 'Owner (member) ID is required' }),
  typeId:  Joi.number().integer().positive().required().messages({ 'any.required': 'Vehicle type ID is required' }),
});

const updateVehicleSchema = Joi.object({
  registrationNumber: Joi.string().trim().uppercase().max(20),
  ownerId:            Joi.number().integer().positive(),
  typeId:             Joi.number().integer().positive(),
}).min(1).messages({ 'object.min': 'At least one field must be provided for update' });

module.exports = { createVehicleSchema, updateVehicleSchema };
