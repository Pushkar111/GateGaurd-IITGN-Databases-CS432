// src/api/axios.js
// Central axios instance with silent token refresh interceptor

import axios from 'axios';

export const STORAGE_ACCESS_KEY  = 'gateguard_token';
export const STORAGE_REFRESH_KEY = 'gateguard_refresh';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ── Request interceptor ───────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_ACCESS_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: Silent Refresh ──────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If not 401, or if it's already a retry, or if it's the login/refresh endpoint itself
    if (
      !error.response ||
      error.response.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url.includes('/auth/login') ||
      originalRequest.url.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    // Queue requests if refresh is already in progress
    if (isRefreshing) {
      return new Promise(function(resolve, reject) {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      }).catch(err => {
        return Promise.reject(err);
      });
    }

    // Start refresh process
    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem(STORAGE_REFRESH_KEY);

    if (!refreshToken) {
      // No refresh token available, must hard logout
      isRefreshing = false;
      forceLogout();
      return Promise.reject(error);
    }

    try {
      const res = await axios.post('/api/auth/refresh', { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = res.data.data;

      localStorage.setItem(STORAGE_ACCESS_KEY,  accessToken);
      localStorage.setItem(STORAGE_REFRESH_KEY, newRefreshToken);

      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;

      processQueue(null, accessToken);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      forceLogout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

function forceLogout() {
  localStorage.removeItem(STORAGE_ACCESS_KEY);
  localStorage.removeItem(STORAGE_REFRESH_KEY);
  localStorage.removeItem('gateguard_user');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

export default api;
