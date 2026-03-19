// src/middleware/rbac.js
// Role-Based Access Control — factory function
// Usage: router.delete('/:id', authenticate, authorize(ROLES.SUPERADMIN), controller)

const AppError = require('../utils/AppError');

/**
 * Returns middleware that checks req.user.role is in the allowed list.
 * @param {...string} roles - one or more role strings from ROLES constants
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authenticated.', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. This action requires one of: ${roles.join(', ')}. Your role: ${req.user.role}`,
          403
        )
      );
    }
    next();
  };
}

module.exports = { authorize };
