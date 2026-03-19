// src/api/auth.api.js
// All auth endpoints per Ultra Pro Max Spec

import api from './axios';

// Public Auth
export const login          = (data) => api.post('/auth/login',           data).then((r) => r.data);
export const refresh        = (refreshToken) => api.post('/auth/refresh', typeof refreshToken === 'string' ? { refreshToken } : refreshToken).then((r) => r.data);
export const forgotPassword = (email) => api.post('/auth/forgot-password', typeof email === 'string' ? { email } : email).then((r) => r.data);
export const verifyOTP      = (resetToken, otp) => api.post('/auth/verify-otp', typeof resetToken === 'object' ? resetToken : { resetToken, otp }).then((r) => r.data);
export const verifyOtp      = verifyOTP;
export const resetPassword  = (data) => api.post('/auth/reset-password',  data).then((r) => r.data);

// Authenticated
export const getMe          = ()     => api.get('/auth/me').then((r) => r.data);
export const logout         = (data) => api.post('/auth/logout',          data).then((r) => r.data);
export const changePassword = (data) => api.post('/auth/change-password', data).then((r) => r.data);
export const getLoginHistory= ()     => api.get('/auth/login-history').then((r) => r.data);

// Admin
export const register       = (data) => api.post('/auth/register',        data).then((r) => r.data);
