// src/api/members.api.js
import api from './axios';

export const getAll   = (params) => api.get('/members',   { params }).then((r) => r.data);
export const getById  = (id)     => api.get(`/members/${id}`).then((r) => r.data);
export const create   = (data)   => api.post('/members',  data).then((r) => r.data);
export const update   = (id, data) => api.put(`/members/${id}`, data).then((r) => r.data);
export const remove   = (id)     => api.delete(`/members/${id}`).then((r) => r.data);

export const getMemberTypes = () =>
  api.get('/member-types').then((r) => r.data);
