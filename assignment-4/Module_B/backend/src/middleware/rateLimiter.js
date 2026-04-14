// src/middleware/rateLimiter.js
// express-rate-limit configuration
// Two limiters: global (100/15min) and strict auth limiter (5/15min)

const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/helpers');

const isDev = process.env.NODE_ENV === 'development';

// global limiter applied to all API routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 5000 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(res, 'Too many requests — please wait a bit and try again.', 429);
  },
});

// strict limiter for login to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // don't count successful logins
  handler: (req, res) => {
    sendError(
      res,
      'Too many login attempts. Please wait 15 minutes before trying again.',
      429
    );
  },
});

module.exports = { globalLimiter, authLimiter };
