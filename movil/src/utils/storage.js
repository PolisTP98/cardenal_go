import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export async function setItem(key, value) {
  try {
    if (isWeb) {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
    console.log(`[STORAGE] Guardado exitoso de ${key}`);
    return true;
  } catch (error) {
    console.error(`[STORAGE] Error guardando ${key} en SecureStore:`, error);
    try {
      localStorage.setItem(key, value);
      console.log(`[STORAGE] Guardado exitoso de ${key} usando localStorage (fallback)`);
      return true;
    } catch (e) {
      console.error(`[STORAGE] Error crítico guardando ${key}:`, e);
      return false;
    }
  }
}

export async function getItem(key) {
  try {
    if (isWeb) {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.warn(`[STORAGE] Error leyendo ${key} de SecureStore, intentando localStorage:`, error);
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error(`[STORAGE] Error crítico leyendo ${key}:`, e);
      return null;
    }
  }
}

export async function deleteItem(key) {
  try {
    if (isWeb) {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
    console.log(`[STORAGE] Borrado exitoso de ${key}`);
    return true;
  } catch (error) {
    console.error(`[STORAGE] Error borrando ${key} en SecureStore:`, error);
    try {
      localStorage.removeItem(key);
      console.log(`[STORAGE] Borrado exitoso de ${key} usando localStorage (fallback)`);
      return true;
    } catch (e) {
      console.error(`[STORAGE] Error crítico borrando ${key}:`, e);
      return false;
    }
  }
}
