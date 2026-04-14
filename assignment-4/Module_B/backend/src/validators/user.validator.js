// src/validators/user.validator.js
// Joi schemas for user management endpoints

const Joi = require('joi');

// create user — all fields required
const createUserSchema = Joi.object({
  username: Joi.string().trim().alphanum().min(3).max(50).required().messages({
    'string.empty':    'Username is required',
    'string.alphanum': 'Username must contain only letters and numbers',
    'string.min':      'Username must be at least 3 characters',
    'string.max':      'Username cannot exceed 50 characters',
    'any.required':    'Username is required',
  }),
  password: Joi.string()
    .min(8)
    .max(100)
    .pattern(/[A-Z]/, 'uppercase letter')
    .pattern(/[a-z]/, 'lowercase letter')
    .pattern(/[0-9]/, 'number')
    .required()
    .messages({
      'string.min':          'Password must be at least 8 characters',
      'string.pattern.name': 'Password must contain at least one {#name}',
      'any.required':        'Password is required',
    }),
  roleId: Joi.number().integer().positive().required().messages({
    'number.base':  'Role ID must be a number',
    'any.required': 'Role ID is required',
  }),
});

// update user — all fields optional, but at least one must be present
const updateUserSchema = Joi.object({
  username: Joi.string().trim().alphanum().min(3).max(50).messages({
    'string.alphanum': 'Username must contain only letters and numbers',
    'string.min':      'Username must be at least 3 characters',
    'string.max':      'Username cannot exceed 50 characters',
  }),
  password: Joi.string()
    .min(8)
    .max(100)
    .pattern(/[A-Z]/, 'uppercase letter')
    .pattern(/[a-z]/, 'lowercase letter')
    .pattern(/[0-9]/, 'number')
    .messages({
      'string.min':          'Password must be at least 8 characters',
      'string.pattern.name': 'Password must contain at least one {#name}',
    }),
  roleId: Joi.number().integer().positive().messages({
    'number.base': 'Role ID must be a number',
  }),
})
  .min(1) // require at least one field in an update
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

module.exports = { createUserSchema, updateUserSchema };
