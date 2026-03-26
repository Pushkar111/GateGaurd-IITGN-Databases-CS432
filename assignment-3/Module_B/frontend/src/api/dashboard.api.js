// src/api/dashboard.api.js
import api from './axios';

export const getStats          = () => api.get('/dashboard/stats').then((r) => r.data);
export const getRecentActivity = () => api.get('/dashboard/recent-activity').then((r) => r.data);
export const getVisitTrend     = () => api.get('/dashboard/visit-trend').then((r) => r.data);
