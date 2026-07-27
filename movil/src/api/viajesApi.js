import apiClient from './apiClient';

// Coordenadas fijas de la UPQ (usadas como origen por defecto)
export const UPQ_COORDS = {
  type: 'Point',
  coordinates: [-100.4376, 20.5891], // [longitud, latitud]
};

// GET /api/via/ — Todos los viajes disponibles (estatus=1 Programado)
export const getViajesDisponibles = async (filtros = {}) => {
  const params = { id_estatus: 1, ...filtros };
  const r = await apiClient.get('/api/via/', { params });
  return r.data;
};

// GET /api/via/conductor/:usuarioId — Viajes del conductor actual
export const getMisViajes = async (usuarioId) => {
  const r = await apiClient.get(`/api/via/conductor/${usuarioId}`);
  return r.data;
};

// GET /api/via/:id
export const getViaje = async (id) => {
  const r = await apiClient.get(`/api/via/${id}`);
  return r.data;
};

// POST /api/via/ — Crear nuevo viaje (Conductor)
export const crearViaje = async (datos) => {
  // datos debe incluir ubicacion_inicio y ubicacion_destino como GeoPoint
  const r = await apiClient.post('/api/via/', datos);
  return r.data;
};

// PUT /api/via/:id — Actualizar viaje (cancelar, cambiar estatus)
export const actualizarViaje = async (id, datos) => {
  const r = await apiClient.put(`/api/via/${id}`, datos);
  return r.data;
};
