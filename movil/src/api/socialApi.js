import apiClient from './apiClient';

// ========================
// | AMIGOS / RELACIONES  |
// ========================

// Enviar solicitud de amistad
export const enviarSolicitudAmistad = async (idUsuario1, idUsuario2) => {
  const r = await apiClient.post('/api/soc/amigos', {
    id_usuario1: idUsuario1,
    id_usuario2: idUsuario2,
  });
  return r.data;
};

// Listar relaciones sociales de un usuario (con filtro opcional por estatus)
// estatus: 1=Pendiente, 2=Amigos, 3=Bloqueado
export const getRelacionesSociales = async (usuarioId, idEstatusSocial = null) => {
  const params = idEstatusSocial !== null ? { id_estatus_social: idEstatusSocial } : {};
  const r = await apiClient.get(`/api/soc/amigos/${usuarioId}`, { params });
  return r.data;
};

// Obtener solicitudes de amistad RECIBIDAS pendientes
export const getSolicitudesPendientes = async (usuarioId) => {
  const r = await apiClient.get(`/api/soc/amigos/${usuarioId}/pendientes`);
  return r.data;
};

// Actualizar relación social: aceptar (2), bloquear (3)
export const actualizarRelacionSocial = async (relacionId, idEstatusSocial) => {
  const r = await apiClient.put(`/api/soc/amigos/${relacionId}`, {
    id_estatus_social: idEstatusSocial,
  });
  return r.data;
};

// Eliminar amistad o cancelar solicitud
export const eliminarAmistad = async (relacionId) => {
  await apiClient.delete(`/api/soc/amigos/${relacionId}`);
};

// Verificar relación entre dos usuarios (helper local)
export const getRelacionEntreUsuarios = async (miId, otroId) => {
  try {
    const relaciones = await getRelacionesSociales(miId);
    return relaciones.find(
      (r) =>
        (r.id_usuario1 === miId && r.id_usuario2 === otroId) ||
        (r.id_usuario1 === otroId && r.id_usuario2 === miId)
    ) || null;
  } catch {
    return null;
  }
};

// ======================
// | CHATS Y MENSAJES   |
// ======================

// Obtener (o crear) el chat de un viaje
export const getChatViaje = async (viajeId) => {
  const r = await apiClient.get(`/api/soc/chats/viaje/${viajeId}`);
  return r.data;
};

// Bandeja de entrada: todos los chats del usuario
export const getChatsUsuario = async (usuarioId) => {
  const r = await apiClient.get(`/api/soc/chats/usuario/${usuarioId}`);
  return r.data;
};

// Obtener mensajes de un chat
export const getMensajesChat = async (chatId, skip = 0, limit = 50) => {
  const r = await apiClient.get(`/api/soc/chats/${chatId}/mensajes`, {
    params: { skip, limit },
  });
  return r.data;
};

// Enviar mensaje
export const enviarMensaje = async (chatId, idEmisor, idReceptor, contenido, imagen) => {
  const formData = new FormData();
  formData.append('id_chat', chatId);
  formData.append('id_emisor', idEmisor);
  formData.append('id_receptor', idReceptor);
  if (contenido) {
    formData.append('contenido', contenido);
  }
  if (imagen) {
    formData.append('imagen', {
      uri: imagen.uri,
      name: imagen.fileName || `chat_image.jpg`,
      type: 'image/jpeg',
    });
  }

  const r = await apiClient.post('/api/soc/mensajes', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return r.data;
};

// Marcar todos los mensajes de un chat como leídos
export const marcarChatLeido = async (chatId, usuarioId) => {
  await apiClient.put(`/api/soc/mensajes/chat/${chatId}/leidos`, null, {
    params: { usuario_id: usuarioId },
  });
};

// Obtener (o crear) un chat directo con otro usuario
export const getChatDirecto = async (otroUsuarioId) => {
  const r = await apiClient.get(`/api/soc/chats/directo/${otroUsuarioId}`);
  return r.data;
};

// ========================
// | BÚSQUEDA DE USUARIOS |
// ========================

export const buscarUsuarios = async (q, excluirId = null) => {
  const params = { busqueda: q };
  if (excluirId) params.excluir_id = excluirId;
  const r = await apiClient.get('/api/usu/', { params });
  return r.data;
};
