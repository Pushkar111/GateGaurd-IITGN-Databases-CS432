// src/api/audit.api.js
import api from './axios';

export const getAll  = (params) => api.get('/audit', { params }).then((r) => r.data);
export const getById = (id)     => api.get(`/audit/${id}`).then((r) => r.data);
