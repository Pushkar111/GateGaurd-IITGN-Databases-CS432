// src/utils/AppError.js
// Custom error class that carries HTTP status + extra details
// Thrown inside services, caught by the global error handler

class AppError extends Error {
  constructor(message, statusCode = 500, fields = null) {
    super(message);
    this.statusCode = statusCode;
    this.fields = fields;     // optional field-level validation errors
    this.isOperational = true; // distinguish our errors from unknown bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
