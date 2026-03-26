// src/validators/gate.validator.js
const Joi = require('joi');

const createGateSchema = Joi.object({
  name:     Joi.string().trim().max(50).required().messages({ 'any.required': 'Gate name is required' }),
  location: Joi.string().trim().max(100).required().messages({ 'any.required': 'Location is required' }),
  status:   Joi.string().valid('Active', 'Inactive').required().messages({ 'any.only': 'Status must be Active or Inactive', 'any.required': 'Status is required' }),
});

const updateGateSchema = Joi.object({
  name:     Joi.string().trim().max(50),
  location: Joi.string().trim().max(100),
  status:   Joi.string().valid('Active', 'Inactive'),
}).min(1).messages({ 'object.min': 'At least one field must be provided' });

const updateOccupancySchema = Joi.object({
  occupancyCount: Joi.number().integer().min(0).required().messages({
    'any.required': 'Occupancy count is required',
    'number.min':   'Occupancy count cannot be negative',
  }),
  capacityLimit: Joi.number().integer().min(1).max(500).optional().messages({
    'number.base': 'Capacity limit must be a number',
    'number.min': 'Capacity limit must be at least 1',
    'number.max': 'Capacity limit cannot exceed 500',
  }),
  emergencyOverride: Joi.boolean().default(false),
  incidentNote: Joi.string().trim().max(500).allow(''),
});

module.exports = { createGateSchema, updateGateSchema, updateOccupancySchema };
