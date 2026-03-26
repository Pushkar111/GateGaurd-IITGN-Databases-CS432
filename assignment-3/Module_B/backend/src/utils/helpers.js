// src/utils/helpers.js
// Reusable utility functions for pagination and response formatting

/**
 * Parse pagination params from request query string.
 * Defaults: page=1, limit=20, max limit capped at 100.
 */
function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page, 10)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Build a pagination metadata object for response.
 */
function buildPagination(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Standard success response wrapper.
 * @param {object} res   - Express response
 * @param {*}      data  - payload to return
 * @param {number} [statusCode=200]
 * @param {object} [pagination] - optional pagination metadata
 */
function sendSuccess(res, data, statusCode = 200, pagination = null) {
  const body = { success: true, data };
  if (pagination) body.pagination = pagination;
  return res.status(statusCode).json(body);
}

/**
 * Standard error response wrapper (used by global error handler).
 */
function sendError(res, message, statusCode = 500, fields = null) {
  const body = { success: false, error: { message } };
  if (fields) body.error.fields = fields;
  return res.status(statusCode).json(body);
}

/**
 * Strip password fields from a user object before returning it.
 */
function sanitizeUser(user) {
  if (!user) return null;
  const { PasswordHash, Password, password_hash, ...safe } = user;
  return safe;
}

module.exports = { parsePagination, buildPagination, sendSuccess, sendError, sanitizeUser };
