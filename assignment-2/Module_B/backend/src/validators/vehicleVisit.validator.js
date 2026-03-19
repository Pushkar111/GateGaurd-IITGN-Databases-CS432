// src/validators/vehicleVisit.validator.js
const Joi = require('joi');

const recordEntrySchema = Joi.object({
  vehicleId:   Joi.number().integer().positive().required().messages({ 'any.required': 'Vehicle ID is required' }),
  entryGateId: Joi.number().integer().positive().required().messages({ 'any.required': 'Entry gate ID is required' }),
});

const recordExitSchema = Joi.object({
  exitGateId: Joi.number().integer().positive().required().messages({ 'any.required': 'Exit gate ID is required' }),
});

module.exports = { recordEntrySchema, recordExitSchema };
