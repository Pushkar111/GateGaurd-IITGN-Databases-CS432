// src/api/vehicles.api.js
import api from './axios';

export const getAll  = (params)   => api.get('/vehicles',   { params }).then((r) => r.data);
export const getById = (id)       => api.get(`/vehicles/${id}`).then((r) => r.data);
export const create  = (data)     => api.post('/vehicles',  data).then((r) => r.data);
export const update  = (id, data) => api.put(`/vehicles/${id}`, data).then((r) => r.data);
export const remove  = (id)       => api.delete(`/vehicles/${id}`).then((r) => r.data);

export const getVehicleTypes = () =>
  api.get('/vehicle-types').then((r) => r.data);
