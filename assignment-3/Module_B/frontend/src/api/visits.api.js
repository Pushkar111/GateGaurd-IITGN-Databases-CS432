// src/api/visits.api.js
import api from './axios';

// -- Person Visits ------------------------------------------------------
export const getPersonVisits   = (params) => api.get('/person-visits', { params }).then((r) => r.data);
export const getPersonVisitById = (id)    => api.get(`/person-visits/${id}`).then((r) => r.data);
export const recordPersonEntry = (data)   => api.post('/person-visits/entry', data).then((r) => r.data);
export const recordPersonExit  = (id, data) => api.put(`/person-visits/${id}/exit`, data).then((r) => r.data);
export const deletePersonVisit = (id)     => api.delete(`/person-visits/${id}`).then((r) => r.data);

// -- Vehicle Visits -----------------------------------------------------
export const getVehicleVisits    = (params) => api.get('/vehicle-visits', { params }).then((r) => r.data);
export const getVehicleVisitById = (id)     => api.get(`/vehicle-visits/${id}`).then((r) => r.data);
export const recordVehicleEntry  = (data)   => api.post('/vehicle-visits/entry', data).then((r) => r.data);
export const recordVehicleExit   = (id, data) => api.put(`/vehicle-visits/${id}/exit`, data).then((r) => r.data);
export const deleteVehicleVisit  = (id)     => api.delete(`/vehicle-visits/${id}`).then((r) => r.data);
