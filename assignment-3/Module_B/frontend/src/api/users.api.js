// src/api/users.api.js
import api from './axios';

export const getAll  = (params)   => api.get('/users',   { params }).then((r) => r.data);
export const getById = (id)       => api.get(`/users/${id}`).then((r) => r.data);
export const create  = (data)     => api.post('/users',  data).then((r) => r.data);
export const getPendingRequests = () => api.get('/users/requests/pending').then((r) => r.data);
export const approveRequest = (id) => api.post(`/users/requests/${id}/approve`).then((r) => r.data);
export const rejectRequest = (id, note) => api.post(`/users/requests/${id}/reject`, note ? { note } : {}).then((r) => r.data);
export const update  = (id, data) => api.put(`/users/${id}`, data).then((r) => r.data);
export const remove  = (id)       => api.delete(`/users/${id}`).then((r) => r.data);
export const getRoles = ()        => api.get('/roles').then((r) => r.data);
