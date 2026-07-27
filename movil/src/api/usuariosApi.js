import apiClient from './apiClient';

// GET /api/usu/me
export const getMe = async () => {
  const r = await apiClient.get('/api/usu/me');
  return r.data;
};

// GET /api/usu/:id
export const getUsuario = async (id) => {
  const r = await apiClient.get(`/api/usu/${id}`);
  return r.data;
};

// PUT /api/usu/:id
export const updateUsuario = async (id, datos) => {
  const r = await apiClient.put(`/api/usu/${id}`, datos);
  return r.data;
};

// GET /api/usu/conductores/:usuarioId
export const getConductorByUsuario = async (usuarioId) => {
  const r = await apiClient.get(`/api/usu/conductores/${usuarioId}`);
  return r.data;
};

// POST /api/usu/conductores
export const registrarConductor = async (datos) => {
  const r = await apiClient.post('/api/usu/conductores', datos);
  return r.data;
};

// GET /api/usu/vehiculos/:conductorId
export const getVehiculos = async (conductorId) => {
  const r = await apiClient.get(`/api/usu/vehiculos/${conductorId}`);
  return r.data;
};

// POST /api/usu/vehiculos
export const registrarVehiculo = async (datos) => {
  const r = await apiClient.post('/api/usu/vehiculos', datos);
  return r.data;
};
