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

// GET /api/usu/conductores/usuario/:usuarioId  ← endpoint explícito por id_usuario
export const getConductorByUsuario = async (usuarioId) => {
  // Usamos la ruta /usuario/{id} que busca exclusivamente por id_usuario,
  // NO la ruta genérica /{id} que primero busca por conductor.id (podría devolver el conductor incorrecto)
  const r = await apiClient.get(`/api/usu/conductores/usuario/${usuarioId}`);
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
