// src/middleware/errorHandler.js
// Global Express error handler — must be registered LAST in app.js
// Catches everything thrown by next(err) in routes and controllers

const logger = require('../utils/logger');
const { sendError } = require('../utils/helpers');
const env = require('../config/env');

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // default to 500 unless explicitly set
  const statusCode = err.statusCode || 500;
  const message    = err.message    || 'Something went wrong on our end.';

  // log server errors (non-operational = unexpected bugs)
  if (!err.isOperational || statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} — ${statusCode} — ${err.stack || message}`);
  }

  // in development send the stack trace for easier debugging
  if (env.NODE_ENV === 'development' && statusCode >= 500) {
    return res.status(statusCode).json({
      success: false,
      error: {
        message,
        fields: err.fields || null,
        stack: err.stack,
      },
    });
  }

  return sendError(res, message, statusCode, err.fields || null);
}

module.exports = errorHandler;
