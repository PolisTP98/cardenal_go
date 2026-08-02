import axios from 'axios';
import { getItem } from '../utils/storage';

//  IP de la computadora en la red local
// 192.168.0.13
// 172.31.33.168
export const API_BASE_URL = 'http://192.168.0.12:8000';
console.log(`[API Client] Usando URL base de API: ${API_BASE_URL}`);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de REQUEST: adjunta el token JWT automáticamente
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getItem('cgo_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Continuar sin token si hay error
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de RESPONSE: manejo centralizado de errores con diagnósticos completos
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;

    if (status === 401) {
      // Token expirado o inválido
      error.isAuthError = true;
    }

    // Formato de error estandarizado
    const baseMessage =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((e) => e.msg).join(', ')
          : error.message || 'Error de conexión';

    // Generar diagnóstico técnico del endpoint y la llamada
    const endpoint = error.config?.url || 'desconocido';
    const method = error.config?.method?.toUpperCase() || 'DESCONOCIDO';
    const fullUrl = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    let verboseMessage = `Detalle del Error:\n${baseMessage}\n\n`;
    verboseMessage += `Diagnóstico técnico:\n`;
    verboseMessage += `- URL: ${fullUrl}\n`;
    verboseMessage += `- Método: ${method}\n`;
    verboseMessage += `- Estatus HTTP: ${status || 'Sin respuesta (Network Error)'}\n`;

    if (!status) {
      verboseMessage += `\nSugerencia de conexión:\n`;
      verboseMessage += `1. Asegúrate de que el servidor FastAPI está corriendo en tu PC.\n`;
      verboseMessage += `2. Revisa que tu PC y tu teléfono móvil estén en la misma red Wi-Fi.\n`;
      verboseMessage += `3. Si usas móvil físico, asegúrate de que el firewall de tu PC permita conexiones entrantes al puerto 8000.`;
    }

    error.displayMessage = verboseMessage;
    return Promise.reject(error);
  }
);

export default apiClient;
