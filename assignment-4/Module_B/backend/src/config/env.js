// src/config/env.js
// Load and export all environment variables with defaults

require('dotenv').config();

const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

module.exports = {
  NODE_ENV:    process.env.NODE_ENV    || 'development',
  PORT:        parseInt(process.env.PORT, 10) || 5000,
  DB_HOST:     process.env.DB_HOST,
  DB_PORT:     parseInt(process.env.DB_PORT, 10) || 5432,
  DB_NAME:     process.env.DB_NAME,
  DB_USER:     process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_MAX:      parseInt(process.env.DB_MAX_CONNECTIONS, 10) || 20,
  JWT_SECRET:  process.env.JWT_SECRET,
  JWT_EXPIRES: process.env.JWT_EXPIRES_IN || '7d',
  FRONTEND_URL: process.env.FRONTEND_URL,
  AUDIT_LOG:   process.env.AUDIT_LOG_PATH || 'logs/audit.log',
  // SMTP
  SMTP_HOST:   process.env.SMTP_HOST   || null,
  SMTP_PORT:   parseInt(process.env.SMTP_PORT, 10) || 587,
  SMTP_USER:   process.env.SMTP_USER   || null,
  SMTP_PASS:   process.env.SMTP_PASS   || null,
  SMTP_FROM:   process.env.SMTP_FROM   || null,
  // JWT access/refresh
  JWT_ACCESS_EXPIRES:  process.env.JWT_ACCESS_EXPIRES  || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',
  // OTP & lockout
  OTP_EXPIRES_MINUTES:       parseInt(process.env.OTP_EXPIRES_MINUTES, 10)       || 15,
  MAX_LOGIN_ATTEMPTS:        parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10)        || 5,
  LOCKOUT_DURATION_MINUTES:  parseInt(process.env.LOCKOUT_DURATION_MINUTES, 10)  || 30,
};
