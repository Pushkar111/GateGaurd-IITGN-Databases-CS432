// src/services/auth.service.js
// Business logic for authentication — full ULTRA PRO MAX implementation
// Lockout, refresh tokens, OTP, password reset, token blacklist

const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const crypto    = require('crypto');
const userModel = require('../models/user.model');
const roleModel = require('../models/role.model');
const authModel = require('../models/auth.model');
const AppError  = require('../utils/AppError');
const { sanitizeUser } = require('../utils/helpers');
const email     = require('../utils/email');
const logger    = require('../utils/logger');
const env       = require('../config/env');
const { query } = require('../config/db');

// ── Helper: find user with auth fields ────────────────────────────────
async function findUserForAuth(username) {
  const { rows } = await query(
    `SELECT u.userid, u.username, u.passwordhash, u.roleid, u.email,
            u.failedattempts, u.lockeduntil, u.mustchangepassword,
            r.rolename AS role
       FROM "User" u
       JOIN role r ON r.roleid = u.roleid
      WHERE u.username = $1`,
    [username]
  );
  return rows[0] || null;
}

async function findUserById(userId) {
  const { rows } = await query(
    `SELECT u.userid, u.username, u.email, u.roleid, u.mustchangepassword,
            u.failedattempts, u.lockeduntil, u.lastloginat,
            r.rolename AS role
       FROM "User" u
       JOIN role r ON r.roleid = u.roleid
      WHERE u.userid = $1`,
    [userId]
  );
  return rows[0] || null;
}

async function findUserByEmail(emailAddr) {
  const { rows } = await query(
    `SELECT u.userid, u.username, u.email, u.roleid, r.rolename AS role
       FROM "User" u
       JOIN role r ON r.roleid = u.roleid
      WHERE LOWER(u.email) = LOWER($1)`,
    [emailAddr]
  );
  return rows[0] || null;
}

// ── Helper: member association ────────────────────────────────────────
async function getMemberId(username) {
  try {
    const { rows } = await query(
      `SELECT memberid AS "MemberID"
         FROM member
        WHERE LOWER(email) = LOWER($1)
           OR LOWER(split_part(email, '@', 1)) = LOWER($2)
        LIMIT 1`,
      [username, username]
    );
    return rows.length > 0 ? rows[0].MemberID : null;
  } catch { return null; }
}

// ── Helper: generate tokens ──────────────────────────────────────────
function generateAccessToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES });
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function getRefreshExpiry() {
  // Parse "7d" → milliseconds
  const match = env.JWT_REFRESH_EXPIRES.match(/^(\d+)([dhm])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const val = parseInt(match[1], 10);
  const unit = match[2];
  const ms = unit === 'd' ? val * 86400000 : unit === 'h' ? val * 3600000 : val * 60000;
  return new Date(Date.now() + ms);
}

/**
 * POST /api/auth/login
 * Full spec implementation: lockout check → bcrypt → failed attempts → refresh token
 */
async function login(username, password, ipAddress, userAgent) {
  const user = await findUserForAuth(username);

  // User not found
  if (!user) {
    authModel.saveLoginHistory(null, ipAddress, userAgent, false, 'user_not_found').catch(() => {});
    throw new AppError('Invalid username or password.', 401);
  }

  // Check lockout
  if (user.lockeduntil && new Date(user.lockeduntil) > new Date()) {
    throw new AppError(`Account locked until ${user.lockeduntil}`, 423, {
      lockedUntil: user.lockeduntil,
    });
  } else if (user.lockeduntil) {
    // Lock expired — auto-unlock
    await authModel.unlockAccount(user.userid);
  }

  // Password check
  const passwordOk = await bcrypt.compare(password, user.passwordhash);
  if (!passwordOk) {
    const attempts = await authModel.incrementFailedAttempts(user.userid);

    // Check if should lock
    if (attempts >= env.MAX_LOGIN_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + env.LOCKOUT_DURATION_MINUTES * 60 * 1000);
      await authModel.lockAccount(user.userid, lockedUntil);
      // Send lockout email (non-blocking)
      if (user.email) {
        email.sendAccountLockedEmail(user.email, user.username, lockedUntil.toISOString())
          .catch((e) => logger.error('[auth] lockout email error: ' + e.message));
      }
    }

    authModel.saveLoginHistory(user.userid, ipAddress, userAgent, false, 'invalid_password').catch(() => {});

    throw new AppError('Invalid username or password.', 401, {
      failedAttempts: attempts,
    });
  }

  // ── Correct password ────────────────────────────────────────────────
  await authModel.resetFailedAttempts(user.userid);
  await authModel.updateLastLogin(user.userid);

  // Non-blocking
  authModel.saveLoginHistory(user.userid, ipAddress, userAgent, true, null).catch(() => {});
  if (user.email) {
    email.sendLoginAlertEmail(user.email, user.username, ipAddress, new Date().toISOString())
      .catch((e) => logger.error('[auth] login alert email error: ' + e.message));
  }

  const memberId = await getMemberId(user.username);

  const payload = {
    userId:   user.userid,
    username: user.username,
    role:     user.role,
    memberId,
  };

  const accessToken  = generateAccessToken(payload);
  const refreshToken = generateRefreshToken();
  const refreshExpiry = getRefreshExpiry();
  await authModel.saveRefreshToken(user.userid, refreshToken, refreshExpiry);

  return {
    accessToken,
    refreshToken,
    user: {
      UserID: user.userid,
      Username: user.username,
      Role: user.role,
      RoleName: user.role,
      RoleID: user.roleid,
      Email: user.email,
      mustChangePassword: user.mustchangepassword || false,
      memberId,
    },
  };
}

/**
 * POST /api/auth/refresh
 * Rotate refresh token, issue new access token.
 */
async function refreshAccessToken(refreshToken) {
  const tokenRecord = await authModel.getRefreshToken(refreshToken);

  if (!tokenRecord || tokenRecord.revoked || new Date(tokenRecord.expiresat) < new Date()) {
    throw new AppError('Invalid or expired refresh token. Please login again.', 401);
  }

  const user = await findUserById(tokenRecord.userid);
  if (!user) throw new AppError('User not found.', 401);

  const memberId = await getMemberId(user.username);

  // New access token
  const newAccessToken = generateAccessToken({
    userId: user.userid,
    username: user.username,
    role: user.role,
    memberId,
  });

  // Rotate refresh token
  await authModel.revokeRefreshToken(refreshToken);
  const newRefreshToken = generateRefreshToken();
  const refreshExpiry   = getRefreshExpiry();
  await authModel.saveRefreshToken(user.userid, newRefreshToken, refreshExpiry);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * POST /api/auth/logout
 * Blacklist access token + revoke refresh token.
 */
async function logout(accessToken, refreshToken) {
  // Blacklist the access token until it expires naturally
  try {
    const decoded = jwt.decode(accessToken);
    if (decoded && decoded.exp) {
      await authModel.blacklistToken(accessToken, new Date(decoded.exp * 1000));
    }
  } catch { /* ignore decode error */ }

  if (refreshToken) {
    await authModel.revokeRefreshToken(refreshToken);
  }
}

/**
 * GET /api/auth/me — returns current authenticated user.
 */
async function getMe(userId) {
  const user = await userModel.findWithRole(userId);
  if (!user) throw new AppError('User not found. Your account may have been deleted.', 404);
  return sanitizeUser(user);
}

/**
 * POST /api/auth/register — SuperAdmin only.
 */
async function register(data) {
  const { username, password, roleId } = data;
  const existing = await userModel.findByUsername(username);
  if (existing) {
    throw new AppError('Username already taken.', 409, {
      username: 'This username is already in use',
    });
  }
  const role = await roleModel.findById(roleId);
  if (!role) throw new AppError('Invalid role ID.', 400);

  const passwordHash = await bcrypt.hash(password, 12);
  const created = await userModel.create({ username, passwordHash, roleId });
  const fullUser = await userModel.findWithRole(created.UserID);
  return sanitizeUser(fullUser);
}

/**
 * POST /api/auth/forgot-password
 * Strict mode for frontend step validation:
 * Unknown email returns 404 so Step 1 can fail visibly.
 */
async function forgotPassword(emailAddr) {
  const normalizedEmail = String(emailAddr || '').trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    throw new AppError('No account found with this email address.', 404, {
      email: 'Email is not registered',
    });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000);

  await authModel.saveOTP(user.userid, otp, resetToken, expiresAt);
  await email.sendOTPEmail(user.email, user.username, otp, env.OTP_EXPIRES_MINUTES);

  return { resetToken, message: 'OTP sent successfully.' };
}

/**
 * POST /api/auth/verify-otp
 */
async function verifyOTP(resetToken, otp) {
  const record = await authModel.getOTPByToken(resetToken);
  if (!record) throw new AppError('Invalid or expired OTP token.', 400);
  if (record.used) throw new AppError('This OTP has already been used.', 400);
  if (new Date(record.expiresat) < new Date()) throw new AppError('OTP has expired.', 400);
  if (record.otp !== String(otp)) throw new AppError('Incorrect OTP. Please try again.', 400);
  return { userId: record.userid, tokenId: record.tokenid, verified: true };
}

/**
 * POST /api/auth/reset-password
 */
async function resetPassword(resetToken, otp, newPassword) {
  const { userId, tokenId } = await verifyOTP(resetToken, otp);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await query(`UPDATE "User" SET passwordhash = $1 WHERE userid = $2`, [passwordHash, userId]);

  await authModel.markOTPUsed(tokenId);
  await authModel.revokeAllUserRefreshTokens(userId);

  const user = await findUserById(userId);
  if (user && user.email) {
    await email.sendPasswordChangedEmail(user.email, user.username);
  }

  return { success: true };
}

/**
 * POST /api/auth/change-password
 */
async function changePassword(userId, currentPassword, newPassword) {
  const { rows } = await query(
    `SELECT passwordhash, email, username FROM "User" u WHERE u.userid = $1`, [userId]
  );
  if (!rows.length) throw new AppError('User not found.', 404);

  const passwordOk = await bcrypt.compare(currentPassword, rows[0].passwordhash);
  if (!passwordOk) throw new AppError('Current password is incorrect.', 400);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await query(`UPDATE "User" SET passwordhash = $1 WHERE userid = $2`, [passwordHash, userId]);

  await authModel.revokeAllUserRefreshTokens(userId);
  await authModel.mustChangePasswordFlag(userId, false);

  // Non-blocking
  if (rows[0].email) {
    email.sendPasswordChangedEmail(rows[0].email, rows[0].username)
      .catch((e) => logger.error('[auth] pw changed email error: ' + e.message));
  }

  return { success: true };
}

/**
 * GET /api/auth/login-history
 */
async function getLoginHistory(userId) {
  return authModel.getLoginHistory(userId, 10);
}

module.exports = {
  login, refreshAccessToken, logout, getMe, register,
  forgotPassword, verifyOTP, resetPassword, changePassword, getLoginHistory,
};
