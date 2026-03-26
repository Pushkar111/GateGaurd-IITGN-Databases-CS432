'use strict';

require('dotenv').config();
const { Client } = require('pg');

const BASE_URL = process.env.AUTH_BASE_URL || 'http://localhost:5000/api/auth';
const BASE_PASSWORD = process.env.SMOKE_BASE_PASSWORD || 'Admin@123';
const TEMP_PASSWORD = process.env.SMOKE_TEMP_PASSWORD || 'Test@1234!';
const USERNAME = process.env.SMOKE_USERNAME || 'superadmin';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@iitgn.ac.in';
const REQUEST_TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 15000);

const out = [];

function log(name, ok, detail) {
  out.push({ name, ok, detail });
  console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + ' | ' + detail);
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, data };
  } finally {
    clearTimeout(timeout);
  }
}

async function post(path, body, token) {
  return fetchJson(BASE_URL + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: JSON.stringify(body || {}),
  });
}

async function get(path, token) {
  return fetchJson(BASE_URL + path, {
    headers: token ? { Authorization: 'Bearer ' + token } : {},
  });
}

async function main() {
  try {
    const health = await fetchJson('http://localhost:5000/api/health');
    log('health', health.status === 200, 'status=' + health.status);
    if (health.status !== 200) {
      throw new Error('Backend not reachable on :5000');
    }

    const login1 = await post('/login', { username: USERNAME, password: BASE_PASSWORD });
    const access1 = login1?.data?.data?.accessToken;
    const refresh1 = login1?.data?.data?.refreshToken;
    log('login(base-password)', login1.status === 200 && !!access1 && !!refresh1, 'status=' + login1.status);
    if (!access1 || !refresh1) {
      throw new Error('Initial login failed');
    }

    const forgot = await post('/forgot-password', { email: EMAIL });
    const resetToken = forgot?.data?.data?.resetToken;
    log('forgot-password', forgot.status === 200 && !!resetToken, 'status=' + forgot.status);
    if (!resetToken) {
      throw new Error('forgot-password did not return resetToken');
    }

    const client = new Client({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    await client.connect();
    const q = await client.query(
      'SELECT otp, token, expiresat FROM passwordresettoken WHERE token = $1 ORDER BY createdat DESC LIMIT 1',
      [resetToken]
    );
    await client.end();

    const otp = q.rows?.[0]?.otp;
    log('db-read-otp', !!otp, otp ? 'otp_found' : 'otp_missing');
    if (!otp) {
      throw new Error('OTP not found in DB for resetToken');
    }

    const verify = await post('/verify-otp', { resetToken, otp });
    log('verify-otp', verify.status === 200 && verify?.data?.data?.verified === true, 'status=' + verify.status);

    const reset = await post('/reset-password', {
      resetToken,
      otp,
      newPassword: TEMP_PASSWORD,
      confirmPassword: TEMP_PASSWORD,
    });
    log('reset-password', reset.status === 200 && reset?.data?.data?.success === true, 'status=' + reset.status);

    const login2 = await post('/login', { username: USERNAME, password: TEMP_PASSWORD });
    const access2 = login2?.data?.data?.accessToken;
    const refresh2 = login2?.data?.data?.refreshToken;
    log('login(temp-password)', login2.status === 200 && !!access2 && !!refresh2, 'status=' + login2.status);

    const ref = await post('/refresh', { refreshToken: refresh2 });
    const access3 = ref?.data?.data?.accessToken;
    const refresh3 = ref?.data?.data?.refreshToken;
    log('refresh', ref.status === 200 && !!access3 && !!refresh3, 'status=' + ref.status);

    const logout = await post('/logout', { refreshToken: refresh3 }, access3);
    log('logout', logout.status === 200, 'status=' + logout.status);

    const meOld = await get('/me', access3);
    const revokedMsg = meOld?.data?.error?.message || '';
    log(
      'revoked-token-check',
      meOld.status === 401 && /revoked/i.test(revokedMsg),
      'status=' + meOld.status + ', message=' + revokedMsg
    );

    const login3 = await post('/login', { username: USERNAME, password: TEMP_PASSWORD });
    const access4 = login3?.data?.data?.accessToken;
    log('relogin(temp-password)', login3.status === 200 && !!access4, 'status=' + login3.status);
    if (!access4) {
      throw new Error('Relogin with temp password failed before revert');
    }
    const revert = await post(
      '/change-password',
      { currentPassword: TEMP_PASSWORD, newPassword: BASE_PASSWORD, confirmPassword: BASE_PASSWORD },
      access4
    );
    log(
      'revert-password(base-password)',
      revert.status === 200 && revert?.data?.data?.success === true,
      'status=' + revert.status
    );

    const passed = out.filter((x) => x.ok).length;
    const total = out.length;
    console.log('\nSUMMARY: ' + passed + '/' + total + ' checks passed');

    if (passed !== total) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('FATAL:', err.message);
    process.exitCode = 1;
  }
}

main();
