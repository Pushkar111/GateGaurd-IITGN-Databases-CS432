// src/middleware/auth.js
// JWT verification middleware with Blacklist and MustChangePassword guards

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const authModel = require('../models/auth.model');
const userModel = require('../models/user.model');

async function authenticate(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('No token provided. Please login first.', 401));
  }

  const token = header.slice(7);

  try {
    // 1. JWT verification
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // 2. Token Blacklist Check
    const isBlacklisted = await authModel.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new AppError('Token has been revoked', 401);
    }

    req.user = {
      userId:   decoded.userId,
      username: decoded.username,
      role:     decoded.role,
      memberId: decoded.memberId ?? null,
    };

    // 3. MustChangePassword Guard Check (re-fetch user state for freshness)
    const userRefreshed = await userModel.findById(decoded.userId);
    if (!userRefreshed) {
      throw new AppError('User not found. Your account may have been deleted.', 401);
    }
    
    // Check if the user is flagged to force a password change.
    // Allow routes: /api/auth/logout, /api/auth/me, /api/auth/change-password
    if (userRefreshed.mustchangepassword) {
      const requestPath = (req.originalUrl || '').split('?')[0];
      const allowedPaths = new Set(['/api/auth/change-password', '/api/auth/logout', '/api/auth/me']);
      if (!allowedPaths.has(requestPath)) {
        return res.status(403).json({
          success: false,
          mustChangePassword: true,
          error: { message: 'Please change your password to continue' }
        });
      }
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please login again.', 401));
    }
    // Forward AppError explicitly
    if (err.isOperational) {
      return next(err);
    }
    return next(new AppError('Invalid token. Please login again.', 401));
  }
}

module.exports = { authenticate };
