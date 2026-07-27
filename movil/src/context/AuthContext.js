import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { jwtDecode } from '../utils/jwtDecode';
import { getItem, setItem, deleteItem } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);   // { id, nombre_completo, role }
  const [loading, setLoading] = useState(true);

  // Cargar sesión guardada al iniciar
  useEffect(() => {
    const restaurarSesion = async () => {
      try {
        console.log('[AuthContext] Restaurando sesión de almacenamiento...');
        const savedToken = await getItem('cgo_token');
        const savedUser = await getItem('cgo_user');
        console.log('[AuthContext] Leídos del almacenamiento:', { hasToken: !!savedToken, savedUser });

        if (savedToken && savedUser) {
          // Verificar que el token no haya expirado
          const payload = jwtDecode(savedToken);
          const ahora = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp > ahora) {
            setToken(savedToken);
            const parsedUser = JSON.parse(savedUser);
            // Asegurar que exista originalRole
            if (!parsedUser.originalRole) {
              parsedUser.originalRole = parsedUser.role;
            }
            setUser(parsedUser);
            console.log('[AuthContext] Sesión restaurada con éxito para:', parsedUser.nombre_completo);
          } else {
            console.warn('[AuthContext] Token expirado, limpiando sesión...');
            await deleteItem('cgo_token');
            await deleteItem('cgo_user');
          }
        } else {
          console.log('[AuthContext] No se encontró sesión previa.');
        }
      } catch (e) {
        console.error('[AuthContext] Error restaurando sesión:', e);
      } finally {
        setLoading(false);
      }
    };
    restaurarSesion();
  }, []);

  const login = async (tokenData) => {
    // tokenData = { access_token, role, usuario_id, nombre_completo }
    const userData = {
      id: tokenData.usuario_id,
      nombre_completo: tokenData.nombre_completo,
      role: tokenData.role,
      originalRole: tokenData.role,
    };

    console.log('[AuthContext] Iniciando guardado de sesión para:', userData);
    const tokenSaved = await setItem('cgo_token', tokenData.access_token);
    const userSaved = await setItem('cgo_user', JSON.stringify(userData));

    if (tokenSaved && userSaved) {
      console.log('[AuthContext] Sesión guardada con éxito.');
      Alert.alert(
        'Sesión Guardada',
        `Sesión iniciada correctamente.\nUsuario: ${userData.nombre_completo}\nRol: ${userData.role}`
      );
    } else {
      console.error('[AuthContext] Error al guardar el token o usuario en almacenamiento.');
      Alert.alert('Error de Sesión', 'La sesión no se pudo guardar en el dispositivo local.');
    }

    setToken(tokenData.access_token);
    setUser(userData);
  };

  const logout = async () => {
    console.log('[AuthContext] Cerrando sesión y limpiando almacenamiento...');
    await deleteItem('cgo_token');
    await deleteItem('cgo_user');
    setToken(null);
    setUser(null);
    Alert.alert('Sesión Cerrada', 'Has cerrado tu sesión.');
  };

  const updateRole = async (newRole) => {
    if (user) {
      const updatedUser = { ...user, role: newRole };
      console.log('[AuthContext] Actualizando rol en almacenamiento a:', newRole);
      await setItem('cgo_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  const value = {
    token,
    user,
    loading,
    isAuthenticated: !!token,
    isDriver: user?.role === 'Conductor',
    isPassenger: user?.role === 'Pasajero',
    login,
    logout,
    updateRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
