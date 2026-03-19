// src/validators/personVisit.validator.js
const Joi = require('joi');

const recordEntrySchema = Joi.object({
  memberId:     Joi.number().integer().positive().required().messages({ 'any.required': 'Member ID is required' }),
  entryGateId:  Joi.number().integer().positive().required().messages({ 'any.required': 'Entry gate ID is required' }),
  vehicleId:    Joi.number().integer().positive().optional().allow(null),
});

const recordExitSchema = Joi.object({
  exitGateId: Joi.number().integer().positive().required().messages({ 'any.required': 'Exit gate ID is required' }),
});

module.exports = { recordEntrySchema, recordExitSchema };
