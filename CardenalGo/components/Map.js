import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';

export default function Map({ waypoints, routeCoords, onMapPress, isInteractive = true }) {
  
  // Función interna para decidir el color del pin
  const getMarkerColor = (index, totalPoints) => {
    if (index === 0) return "green";
    if (index === totalPoints - 1) return "red";
    return "orange";
  };

  return (
    <MapView
      style={styles.map}
      mapType="standard"
      // Si el mapa es interactivo, ejecuta la función onMapPress que le pasen
      onPress={isInteractive ? onMapPress : null}
      initialRegion={{
        latitude: 20.5934, // Centro de Querétaro
        longitude: -100.3812,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }}
    >
      {/* Dibujar Pines */}
      {waypoints && waypoints.map((point, index) => (
        <Marker 
          key={index} 
          coordinate={point} 
          title={index === 0 ? "Inicio" : index === waypoints.length - 1 ? "Destino" : `Parada ${index}`} 
          pinColor={getMarkerColor(index, waypoints.length)} 
        />
      ))}

      {/* Dibujar Ruta */}
      {routeCoords && routeCoords.length > 0 && (
        <Polyline
          coordinates={routeCoords}
          strokeColor="#00aaff"
          strokeWidth={5}
          lineCap="round"
          lineJoin="round"
        />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
  },
});