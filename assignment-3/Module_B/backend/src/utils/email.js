// src/utils/email.js
// All email functions — dark-themed inline HTML, Nodemailer.
// All functions return Promises. Non-blocking usage: .catch(logger.error)

const nodemailer = require('nodemailer');
const logger     = require('./logger');
const env        = require('../config/env');

// ── Transporter (null if not configured) ──────────────────────────────
function createTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host:   env.SMTP_HOST,
    port:   env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

// ── Shared email template ──────────────────────────────────────────────
function wrapHtml(body) {
  return `
    <div style="background:#0d0d1a;padding:40px 20px;font-family:'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:480px;margin:auto;background:#13132a;border-radius:16px;border:1px solid rgba(99,102,241,0.3);overflow:hidden;">
        <div style="height:4px;background:linear-gradient(90deg,#6366f1,#a78bfa,#f472b6);"></div>
        <div style="padding:32px;">
          <div style="text-align:center;margin-bottom:24px;">
            <span style="font-size:28px;font-weight:800;background:linear-gradient(135deg,#6366f1,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">GateGuard</span>
            <p style="color:#6b7280;font-size:12px;margin:4px 0 0;">IIT Gandhinagar Security System</p>
          </div>
          ${body}
        </div>
        <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
          <p style="color:#6b7280;font-size:11px;margin:0;">GateGuard Security System &middot; IIT Gandhinagar</p>
          <p style="color:#6b7280;font-size:11px;margin:4px 0 0;">CS432 Databases &middot; This is an automated message</p>
        </div>
      </div>
    </div>`;
}

// ── Send helper ─────────────────────────────────────────────────────────
async function sendMail(to, subject, htmlBody) {
  const transporter = createTransporter();
  if (!transporter) {
    logger.warn(`[email] No SMTP — skipping "${subject}" to ${to}`);
    return;
  }
  await transporter.sendMail({
    from: env.SMTP_FROM || `"GateGuard" <${env.SMTP_USER}>`,
    to, subject,
    html: wrapHtml(htmlBody),
  });
  logger.info(`[email] Sent "${subject}" to ${to}`);
}

// ── OTP Email ──────────────────────────────────────────────────────────
async function sendOTPEmail(to, username, otp, expiryMinutes) {
  const digits = otp.split('').map((d) =>
    `<span style="display:inline-block;background:#1e1e3f;border:2px solid #6366f1;border-radius:8px;padding:12px 16px;font-size:28px;font-weight:800;color:#a78bfa;letter-spacing:2px;margin:0 4px;">${d}</span>`
  ).join('');

  await sendMail(to, 'GateGuard — Your Password Reset OTP', `
    <p style="color:#c7d2fe;font-size:15px;">Hi ${username},</p>
    <p style="color:#c7d2fe;font-size:14px;">Use this OTP to reset your password:</p>
    <div style="text-align:center;margin:24px 0;">${digits}</div>
    <p style="color:#f59e0b;font-size:13px;text-align:center;">&#9201; Expires in ${expiryMinutes} minutes</p>
    <p style="color:#6b7280;font-size:12px;text-align:center;margin-top:16px;">If you didn't request this, ignore this email.</p>
    <p style="color:#6b7280;font-size:12px;text-align:center;">&#128274; Never share this OTP with anyone</p>
  `);
}

// ── Password Changed Email ─────────────────────────────────────────────
async function sendPasswordChangedEmail(to, username) {
  await sendMail(to, 'GateGuard — Password Changed Successfully', `
    <div style="text-align:center;margin-bottom:16px;">
      <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="22" fill="none" stroke="#10b981" stroke-width="3"/><polyline points="14,24 22,32 34,18" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <p style="color:#c7d2fe;font-size:15px;">Hi ${username},</p>
    <p style="color:#c7d2fe;font-size:14px;">Your password has been changed successfully.</p>
    <p style="color:#6b7280;font-size:12px;">Changed at: ${new Date().toISOString()}</p>
    <p style="color:#c7d2fe;font-size:13px;margin-top:16px;">If you didn't do this, contact your SuperAdmin immediately.</p>
    <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:12px;margin-top:12px;text-align:center;">
      <p style="color:#ef4444;font-size:12px;margin:0;">&#9888; Unauthorized? Contact: superadmin@iitgn.ac.in</p>
    </div>
  `);
}

// ── Account Locked Email ───────────────────────────────────────────────
async function sendAccountLockedEmail(to, username, unlockTime) {
  await sendMail(to, 'GateGuard — Account Temporarily Locked', `
    <div style="text-align:center;margin-bottom:16px;">
      <span style="font-size:48px;">&#128274;</span>
    </div>
    <p style="color:#c7d2fe;font-size:15px;">Hi ${username},</p>
    <p style="color:#ef4444;font-size:14px;font-weight:600;">Too many failed login attempts.</p>
    <p style="color:#c7d2fe;font-size:14px;">Your account is locked until: <strong style="color:#f59e0b;">${unlockTime}</strong></p>
    <p style="color:#6b7280;font-size:12px;margin-top:16px;">Contact your SuperAdmin to unlock immediately.</p>
  `);
}

// ── Welcome Email ──────────────────────────────────────────────────────
async function sendWelcomeEmail(to, username, temporaryPassword) {
  const appUrl = env.FRONTEND_URL || 'http://localhost:5173';
  await sendMail(to, 'GateGuard — Welcome to the System', `
    <p style="color:#c7d2fe;font-size:15px;">Welcome, ${username}!</p>
    <p style="color:#c7d2fe;font-size:14px;">Your GateGuard account has been created. Here are your login credentials:</p>
    <div style="background:#1e1e3f;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="color:#a78bfa;font-size:13px;margin:0 0 8px;">Username: <strong style="color:#c7d2fe;">${username}</strong></p>
      <p style="color:#a78bfa;font-size:13px;margin:0;">Temporary Password: <strong style="color:#c7d2fe;">${temporaryPassword}</strong></p>
    </div>
    <p style="color:#f59e0b;font-size:13px;">&#9888; You will be required to change this password on first login.</p>
    <div style="text-align:center;margin-top:20px;">
      <a href="${appUrl}/login" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#818cf8);color:white;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Login to GateGuard</a>
    </div>
  `);
}

// ── Login Alert Email ──────────────────────────────────────────────────
async function sendLoginAlertEmail(to, username, ipAddress, timestamp) {
  await sendMail(to, 'GateGuard — New Login to Your Account', `
    <p style="color:#c7d2fe;font-size:15px;">Hi ${username},</p>
    <p style="color:#c7d2fe;font-size:14px;">A new login was detected on your account.</p>
    <div style="background:#1e1e3f;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="color:#a78bfa;font-size:13px;margin:0 0 8px;">IP Address: <strong style="color:#c7d2fe;">${ipAddress || 'unknown'}</strong></p>
      <p style="color:#a78bfa;font-size:13px;margin:0;">Time: <strong style="color:#c7d2fe;">${timestamp}</strong></p>
    </div>
    <p style="color:#6b7280;font-size:12px;">If this wasn't you, reset your password immediately.</p>
  `);
}

module.exports = { sendOTPEmail, sendPasswordChangedEmail, sendAccountLockedEmail, sendWelcomeEmail, sendLoginAlertEmail };
