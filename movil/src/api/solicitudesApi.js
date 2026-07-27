import apiClient from './apiClient';

// POST /api/via/solicitudes — Solicitar un viaje
export const crearSolicitud = async (datos) => {
  // datos: { id_viaje, id_pasajero, id_metodo_pago, id_estatus: 1 (Pendiente), ubicacion_recogida, ubicacion_bajada, desvio_metros, precio, notas_adicionales }
  const r = await apiClient.post('/api/via/solicitudes', datos);
  return r.data;
};

// GET /api/via/solicitudes/pasajero/:pasajeroId — Listar solicitudes del pasajero
export const getSolicitudesPasajero = async (pasajeroId) => {
  const r = await apiClient.get(`/api/via/solicitudes/pasajero/${pasajeroId}`);
  return r.data;
};

// GET /api/via/:viajeId/solicitudes — Listar solicitudes recibidas para un viaje (Conductor)
export const getSolicitudesViaje = async (viajeId) => {
  const r = await apiClient.get(`/api/via/${viajeId}/solicitudes`);
  return r.data;
};

// GET /api/via/solicitudes/:solId — Ver detalle de una solicitud
export const getSolicitudDetalle = async (solId) => {
  const r = await apiClient.get(`/api/via/solicitudes/${solId}`);
  return r.data;
};

// PUT /api/via/solicitudes/:solId — Aceptar/Rechazar/Cancelar solicitud
export const actualizarSolicitud = async (solId, idEstatus) => {
  // id_estatus: 3 = Aceptada, 4 = Rechazada, 5 = Cancelada
  const r = await apiClient.put(`/api/via/solicitudes/${solId}`, { id_estatus: idEstatus });
  return r.data;
};
