// src/validators/member.validator.js
const Joi = require('joi');

const createMemberSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.min':  'Name must be at least 2 characters',
    'string.max':  'Name cannot exceed 100 characters',
    'any.required':'Name is required',
  }),
  email: Joi.string().trim().email().max(150).required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required',
  }),
  contactNumber: Joi.string().trim().max(20).required().messages({
    'any.required': 'Contact number is required',
  }),
  typeId: Joi.number().integer().positive().required().messages({
    'any.required': 'Member type is required',
  }),
  age: Joi.number().integer().min(1).max(120).optional().messages({
    'number.min': 'Age must be at least 1',
    'number.max': 'Age cannot exceed 120',
  }),
  department: Joi.string().trim().max(100).optional().allow('', null),
});

const updateMemberSchema = Joi.object({
  name:          Joi.string().trim().min(2).max(100),
  email:         Joi.string().trim().email().max(150),
  contactNumber: Joi.string().trim().max(20),
  typeId:        Joi.number().integer().positive(),
  age:           Joi.number().integer().min(1).max(120).allow(null),
  department:    Joi.string().trim().max(100).allow('', null),
}).min(1).messages({ 'object.min': 'At least one field must be provided for update' });

module.exports = { createMemberSchema, updateMemberSchema };
