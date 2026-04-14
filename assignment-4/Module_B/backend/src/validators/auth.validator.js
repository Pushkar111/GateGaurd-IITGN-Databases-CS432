// src/validators/auth.validator.js
// Joi validation schemas for auth endpoints

const Joi = require('joi');

const loginSchema = Joi.object({
  username: Joi.string().trim().required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const verifyOTPSchema = Joi.object({
  resetToken: Joi.string().required(),
  otp: Joi.string().length(6).required(),
});

const resetPasswordSchema = Joi.object({
  resetToken: Joi.string().required(),
  otp: Joi.string().length(6).required(),
  newPassword: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords do not match',
  }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords do not match',
  }),
});

const registerSchema = Joi.object({
  username: Joi.string().trim().alphanum().min(3).max(50).required(),
  password: Joi.string()
    .min(8).max(100).pattern(/[A-Z]/, 'uppercase letter').pattern(/[a-z]/, 'lowercase letter').pattern(/[0-9]/, 'number')
    .required(),
  roleId: Joi.number().integer().positive().required(),
});

module.exports = {
  loginSchema, refreshSchema, forgotPasswordSchema,
  verifyOTPSchema, resetPasswordSchema, changePasswordSchema,
  registerSchema
};
