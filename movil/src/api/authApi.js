import apiClient from './apiClient';

// POST /api/usu/token — Login con matrícula y contraseña
export const login = async (matricula, contrasena) => {
  // El endpoint usa OAuth2PasswordRequestForm (form-urlencoded)
  const formData = new URLSearchParams();
  formData.append('username', matricula);
  formData.append('password', contrasena);

  const response = await apiClient.post('/api/usu/token', formData.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data;
  // Retorna: { access_token, token_type, role, usuario_id, nombre_completo }
};

// POST /api/usu/ — Registrar nuevo usuario
export const register = async (datos) => {
  // datos: { nombre_completo, matricula, correo_institucional, contrasena_raw }
  const response = await apiClient.post('/api/usu/', datos);
  return response.data;
};
