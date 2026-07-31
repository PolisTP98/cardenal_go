/**
 * ImageViewerModal
 * ─────────────────────────────────────────────────────────────────────
 * Componente reutilizable para visualizar imágenes a pantalla completa.
 *
 * Comportamiento:
 *  - Se abre sobre cualquier pantalla sin perder el estado de fondo.
 *  - Soporta cierre por: botón X, tap en overlay, botón Atrás del SO.
 *  - Muestra un estado de carga mientras la imagen se descarga.
 *  - Muestra un estado de error con botón de cierre si la imagen falla.
 *  - Deshabilita la interacción del fondo mientras está abierto.
 *
 * Props:
 *  - visible:    boolean   — controla si el modal está abierto.
 *  - uri:        string    — URL completa de la imagen a mostrar.
 *  - onClose:   function  — callback invocado al cerrar.
 *  - caption:   string    — (opcional) texto descriptivo bajo la imagen.
 *
 * Uso:
 *  <ImageViewerModal
 *    visible={!!imagenSeleccionada}
 *    uri={imagenSeleccionada}
 *    onClose={() => setImagenSeleccionada(null)}
 *  />
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function ImageViewerModal({ visible, uri, onClose, caption = null }) {
  const insets = useSafeAreaInsets();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  // Resetear estado cuando cambia la imagen o la visibilidad
  useEffect(() => {
    if (visible && uri) {
      setCargando(true);
      setError(false);
    }
  }, [visible, uri]);

  // Soporte para botón Atrás en Android
  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true; // Consumir el evento, no navegar hacia atrás en la pantalla de fondo
    });
    return () => subscription.remove();
  }, [visible, onClose]);

  const handleOverlayPress = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleImagePress = useCallback((e) => {
    // Evitar que el tap en la imagen propague al overlay y cierre el modal
    e.stopPropagation();
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose} // Maneja Esc en web y Atrás en Android
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.92)" barStyle="light-content" />

      {/* OVERLAY — toca fuera de la imagen para cerrar */}
      <TouchableWithoutFeedback onPress={handleOverlayPress}>
        <View style={styles.overlay}>

          {/* Botón cerrar en esquina superior derecha */}
          <TouchableOpacity
            style={[styles.closeBtn, { top: (insets.top || 0) + 12 }]}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.75}
          >
            <View style={styles.closeBtnInner}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Contenedor de la imagen — detiene propagación del tap */}
          <TouchableWithoutFeedback onPress={handleImagePress}>
            <View style={styles.imageContainer}>

              {/* Estado: cargando */}
              {cargando && !error && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.loadingText}>Cargando imagen...</Text>
                </View>
              )}

              {/* Estado: error */}
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="image-outline" size={56} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.errorText}>La imagen no está disponible</Text>
                  <TouchableOpacity style={styles.errorCloseBtn} onPress={onClose}>
                    <Text style={styles.errorCloseBtnText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Imagen principal */}
              {uri && !error && (
                <Image
                  source={{ uri }}
                  style={[styles.image, (cargando || error) && styles.imageHidden]}
                  resizeMode="contain"
                  onLoadStart={() => { setCargando(true); setError(false); }}
                  onLoadEnd={() => setCargando(false)}
                  onError={() => { setCargando(false); setError(true); }}
                />
              )}
            </View>
          </TouchableWithoutFeedback>

          {/* Caption opcional */}
          {caption && !error && (
            <View style={[styles.captionContainer, { paddingBottom: (insets.bottom || 0) + 16 }]}>
              <Text style={styles.captionText} numberOfLines={3}>{caption}</Text>
            </View>
          )}

        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  closeBtnInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  imageContainer: {
    width: SCREEN_W,
    height: SCREEN_H * 0.78,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_H * 0.78,
  },
  imageHidden: {
    opacity: 0,
    position: 'absolute',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 8,
  },
  errorContainer: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  errorText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
  },
  errorCloseBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  errorCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  captionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  captionText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
