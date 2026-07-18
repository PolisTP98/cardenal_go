import React, { useState } from 'react';
import { StyleSheet, View, Text, Alert, TouchableOpacity } from 'react-native';
import axios from 'axios';
import polyline from '@mapbox/polyline';
import Map from '../components/Map';

// Funciones matemáticas
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

const optimizeWaypoints = (points) => {
  if (points.length <= 2) return points;
  let start = points[0]; 
  let unvisited = points.slice(1);
  let optimized = [start];
  let current = start;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDist = getDistance(current.latitude, current.longitude, unvisited[0].latitude, unvisited[0].longitude);
    for (let i = 1; i < unvisited.length; i++) {
      let dist = getDistance(current.latitude, current.longitude, unvisited[i].latitude, unvisited[i].longitude);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    }
    current = unvisited[nearestIdx];
    optimized.push(current);
    unvisited.splice(nearestIdx, 1); 
  }
  return optimized;
};

export default function MapScreen() {
  const [waypoints, setWaypoints] = useState([]);
  const [routeCoords, setRouteCoords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleMapPress = (event) => {
    if (!isLoading) {
      setWaypoints([...waypoints, event.nativeEvent.coordinate]);
    }
  };

  const clearMap = () => {
    setWaypoints([]);
    setRouteCoords([]);
  };

  const calculateAndFetchRoute = async () => {
    if (waypoints.length < 2) {
      Alert.alert("Aviso", "Necesitas al menos 2 puntos para calcular una ruta.");
      return;
    }

    setIsLoading(true);
    const optimizedPoints = optimizeWaypoints(waypoints);
    setWaypoints(optimizedPoints); 

    const apiKey = '9890f506-bf03-45e8-884c-0f8d8bbf46fd'; 
    const pointsQuery = optimizedPoints
      .map(p => `point=${p.latitude},${p.longitude}`)
      .join('&');

    const url = `https://graphhopper.com/api/1/route?${pointsQuery}&profile=car&locale=es&calc_points=true&key=${apiKey}`;

    try {
      const response = await axios.get(url);
      const encodedPolyline = response.data.paths[0].points;
      const decoded = polyline.decode(encodedPolyline);
      const coords = decoded.map(point => ({ latitude: point[0], longitude: point[1] }));
      setRouteCoords(coords);
    } catch (error) {
      Alert.alert("Error", "No se pudo calcular la ruta. Intenta con puntos más cercanos a calles.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Puntos: {waypoints.length}. Toca el mapa para agregar.
        </Text>
      </View>

      <ReusableMap 
        waypoints={waypoints}
        routeCoords={routeCoords}
        onMapPress={handleMapPress}
        isInteractive={true} 
      />

      <View style={styles.buttonContainer}>
        {waypoints.length >= 2 && (
          <TouchableOpacity 
            style={[styles.button, styles.calcButton, isLoading && styles.disabledButton]} 
            onPress={calculateAndFetchRoute}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{isLoading ? "Calculando..." : "Calcular Ruta Óptima"}</Text>
          </TouchableOpacity>
        )}
        {waypoints.length > 0 && (
          <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearMap}>
            <Text style={styles.buttonText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  instructionsContainer: {
    position: 'absolute', top: 50, left: 20, right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: 15,
    borderRadius: 10, zIndex: 10, elevation: 5,
  },
  instructionsText: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', color: '#333' },
  buttonContainer: {
    position: 'absolute', bottom: 40, left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-around', zIndex: 10,
  },
  button: {
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84,
  },
  calcButton: { backgroundColor: '#00aaff' },
  clearButton: { backgroundColor: '#ff4444' },
  disabledButton: { backgroundColor: '#cccccc' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 14, textAlign: 'center' }
});