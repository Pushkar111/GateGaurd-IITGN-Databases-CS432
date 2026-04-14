// src/middleware/validate.js
// Joi validation middleware factory
// Usage: router.post('/', authenticate, validate(schemas.createMember), controller)

const AppError = require('../utils/AppError');

/**
 * Returns Express middleware that validates req.body against a Joi schema.
 * On failure returns 422 with field-level error messages.
 * On success — req.body is replaced with the sanitized/coerced Joi output.
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,  // collect ALL errors, not just the first
      stripUnknown: true, // remove fields not in schema
      convert: true,      // coerce strings to numbers/booleans where schema says so
    });

    if (error) {
      // build a field -> message map for the frontend to show per-field errors
      const fields = {};
      error.details.forEach((d) => {
        const key = d.path.join('.');
        fields[key] = d.message.replace(/['"]/g, ''); // strip Joi's quote wrapping
      });
      return next(new AppError('Validation failed. Please check the highlighted fields.', 422, fields));
    }

    req.body = value;
    next();
  };
}

module.exports = validate;
