// src/controllers/auth.controller.js
// Auth controller delegating directly to auth.service

const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/helpers');
const { writeAuditRecord } = require('../middleware/audit');
const { ACTIONS } = require('../utils/constants');

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const result = await authService.login(username, password, ip, userAgent);

    await writeAuditRecord({
      user: result.user,
      tableName: 'User',
      recordId: result.user.UserID,
      action: ACTIONS.READ,
      method: req.method,
      endpoint: req.originalUrl,
      statusCode: 200,
      ip,
    });

    return sendSuccess(res, result, 200);
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshAccessToken(refreshToken);
    return sendSuccess(res, result, 200);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    const { refreshToken } = req.body;
    await authService.logout(accessToken, refreshToken);
    return sendSuccess(res, { success: true, message: 'Logged out cleanly.' }, 200);
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await authService.getMe(req.user.userId);
    return sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const newUser = await authService.register(req.body);
    await writeAuditRecord({
      user: req.user,
      tableName: 'User',
      recordId: newUser.UserID,
      action: ACTIONS.CREATE,
      newValue: { username: newUser.Username, roleId: newUser.RoleID },
      method: req.method,
      endpoint: req.originalUrl,
      statusCode: 201,
      ip: req.ip,
    });
    return sendSuccess(res, { user: newUser }, 201);
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const result = await authService.forgotPassword(req.body.email);
    return sendSuccess(res, result, 200);
  } catch (err) {
    next(err);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const { resetToken, otp } = req.body;
    const result = await authService.verifyOTP(resetToken, otp);
    return sendSuccess(res, result, 200);
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { resetToken, otp, newPassword } = req.body;
    const result = await authService.resetPassword(resetToken, otp, newPassword);
    return sendSuccess(res, result, 200);
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user.userId, currentPassword, newPassword);
    return sendSuccess(res, result, 200);
  } catch (err) {
    next(err);
  }
}

async function getLoginHistory(req, res, next) {
  try {
    const history = await authService.getLoginHistory(req.user.userId);
    return sendSuccess(res, { history }, 200);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login, refresh, logout, getMe, register,
  forgotPassword, verifyOtp, resetPassword,
  changePassword, getLoginHistory,
};
