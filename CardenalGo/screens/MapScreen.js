import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Map from '../components/Mapa';

export default function MapScreen() {
  const [panelVisible, setPanelVisible] = useState(true);

  return (
    // Reemplazamos SafeAreaView por View para arreglar el warning y el espacio blanco
    <View style={styles.container}>
      
      {/* 1. EL MAPA DE FONDO */}
      <Map />

      {/* 2. BOTÓN PARA OCULTAR/MOSTRAR INFO */}
      <TouchableOpacity 
        style={styles.toggleButton} 
        onPress={() => setPanelVisible(!panelVisible)}
      >
        <Text style={styles.toggleText}>
          {panelVisible ? "👁️ Ocultar Detalles" : "👁️ Ver Detalles"}
        </Text>
      </TouchableOpacity>

      {/* 3. PANEL DE INFORMACIÓN */}
      {panelVisible && (
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Detalles del Viaje</Text>
          <Text style={styles.cardText}>
            Distancia: -- km{"\n"}
            Tiempo estimado: -- min{"\n"}
            Costo sugerido: $--
          </Text>
        </View>
      )}

      {/* 4. BOTONES INFERIORES ARREGLADOS */}
      <View style={styles.bottomButtonsContainer}>
        <TouchableOpacity style={[styles.actionButton, styles.blueButton]}>
          <Text style={styles.buttonText}>Aceptar Viaje</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.redButton]}>
          <Text style={styles.buttonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // Obliga al contenedor a tomar exactamente el ancho y alto de tu Android
    backgroundColor: '#fff',
  },
  toggleButton: {
    position: 'absolute',
    top: 50,
    left: 20, // Lo moví a la izquierda para que no estorbe si usas el teléfono con una mano
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 5, 
  },
  toggleText: {
    fontWeight: 'bold',
    color: '#333',
  },
  infoCard: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  bottomButtonsContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20, // Márgenes laterales para que los botones respiren y no se corten
    right: 20,
    flexDirection: 'row', 
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1, // Esto hace que ambos botones se dividan el ancho disponible 50/50
    marginHorizontal: 10, // Separación entre el botón azul y el rojo
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center', 
    elevation: 3,
  },
  blueButton: {
    backgroundColor: '#007AFF', 
  },
  redButton: {
    backgroundColor: '#FF3B30', 
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});