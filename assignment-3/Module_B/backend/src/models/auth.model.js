// src/models/auth.model.js
// Raw SQL, parameterized queries, all lowercase column names per spec.

const { query } = require('../config/db');
const crypto    = require('crypto');

// ── Refresh Tokens ────────────────────────────────────────────────────
async function saveRefreshToken(userId, token, expiresAt) {
  await query(
    `INSERT INTO refreshtoken (userid, token, expiresat) VALUES ($1, $2, $3)`,
    [userId, token, expiresAt]
  );
}

async function getRefreshToken(token) {
  const { rows } = await query(
    `SELECT * FROM refreshtoken WHERE token = $1 LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

async function revokeRefreshToken(token) {
  await query(`UPDATE refreshtoken SET revoked = TRUE WHERE token = $1`, [token]);
}

async function revokeAllUserRefreshTokens(userId) {
  await query(`UPDATE refreshtoken SET revoked = TRUE WHERE userid = $1 AND revoked = FALSE`, [userId]);
}

// ── OTP / Password Reset Token ────────────────────────────────────────
async function saveOTP(userId, otp, token, expiresAt) {
  // invalidate any existing unused OTPs for this user first
  await query(`UPDATE passwordresettoken SET used = TRUE WHERE userid = $1 AND used = FALSE`, [userId]);
  await query(
    `INSERT INTO passwordresettoken (userid, otp, token, expiresat) VALUES ($1, $2, $3, $4)`,
    [userId, otp, token, expiresAt]
  );
}

async function getOTPByToken(token) {
  const { rows } = await query(
    `SELECT * FROM passwordresettoken WHERE token = $1 LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

async function markOTPUsed(tokenId) {
  await query(`UPDATE passwordresettoken SET used = TRUE WHERE tokenid = $1`, [tokenId]);
}

async function deleteExpiredOTPs() {
  const { rowCount } = await query(`DELETE FROM passwordresettoken WHERE expiresat < NOW()`);
  return rowCount;
}

// ── Token Blacklist ───────────────────────────────────────────────────
async function blacklistToken(token, expiresAt) {
  await query(
    `INSERT INTO tokenblacklist (token, expiresat) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING`,
    [token, expiresAt]
  );
}

async function isTokenBlacklisted(token) {
  const { rows } = await query(
    `SELECT 1 FROM tokenblacklist WHERE token = $1 LIMIT 1`,
    [token]
  );
  return rows.length > 0;
}

async function cleanExpiredBlacklist() {
  const { rowCount } = await query(`DELETE FROM tokenblacklist WHERE expiresat < NOW()`);
  return rowCount;
}

// ── Login History ─────────────────────────────────────────────────────
async function saveLoginHistory(userId, ipAddress, userAgent, success, failReason) {
  await query(
    `INSERT INTO loginhistory (userid, ipaddress, useragent, success, failreason) VALUES ($1, $2, $3, $4, $5)`,
    [userId || null, ipAddress, userAgent, success, failReason || null]
  );
}

async function getLoginHistory(userId, limit = 10) {
  const { rows } = await query(
    `SELECT historyid, ipaddress, useragent, success, failreason, createdat
     FROM loginhistory WHERE userid = $1 ORDER BY createdat DESC LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

// ── Account Lockout ───────────────────────────────────────────────────
async function incrementFailedAttempts(userId) {
  const { rows } = await query(
    `UPDATE "User" SET failedattempts = COALESCE(failedattempts, 0) + 1
     WHERE userid = $1 RETURNING failedattempts`,
    [userId]
  );
  return rows[0]?.failedattempts || 0;
}

async function resetFailedAttempts(userId) {
  await query(`UPDATE "User" SET failedattempts = 0 WHERE userid = $1`, [userId]);
}

async function lockAccount(userId, lockedUntil) {
  await query(`UPDATE "User" SET lockeduntil = $1 WHERE userid = $2`, [lockedUntil, userId]);
}

async function unlockAccount(userId) {
  await query(`UPDATE "User" SET lockeduntil = NULL, failedattempts = 0 WHERE userid = $1`, [userId]);
}

// ── Last Login / MustChangePassword ───────────────────────────────────
async function updateLastLogin(userId) {
  await query(`UPDATE "User" SET lastloginat = NOW() WHERE userid = $1`, [userId]);
}

async function mustChangePasswordFlag(userId, flag) {
  await query(`UPDATE "User" SET mustchangepassword = $1 WHERE userid = $2`, [flag, userId]);
}

module.exports = {
  saveRefreshToken, getRefreshToken, revokeRefreshToken, revokeAllUserRefreshTokens,
  saveOTP, getOTPByToken, markOTPUsed, deleteExpiredOTPs,
  blacklistToken, isTokenBlacklisted, cleanExpiredBlacklist,
  saveLoginHistory, getLoginHistory,
  incrementFailedAttempts, resetFailedAttempts, lockAccount, unlockAccount,
  updateLastLogin, mustChangePasswordFlag,
};
