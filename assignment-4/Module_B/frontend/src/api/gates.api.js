// src/api/gates.api.js
import api from './axios';

export const getAll   = ()          => api.get('/gates').then((r) => r.data);
export const getById  = (id)        => api.get(`/gates/${id}`).then((r) => r.data);
export const create   = (data)      => api.post('/gates', data).then((r) => r.data);
export const update   = (id, data)  => api.put(`/gates/${id}`, data).then((r) => r.data);
export const remove   = (id)        => api.delete(`/gates/${id}`).then((r) => r.data);

// GateOccupancy
export const getAllOccupancy     = ()              => api.get('/gate-occupancy').then((r) => r.data);
export const updateOccupancy    = (id, payloadOrCount)     => {
  const payload = typeof payloadOrCount === 'object'
    ? payloadOrCount
    : { occupancyCount: payloadOrCount };
  return api.put(`/gate-occupancy/${id}`, payload).then((r) => r.data);
};
