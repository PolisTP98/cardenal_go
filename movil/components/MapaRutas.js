import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import axios from 'axios';
import polyline from '@mapbox/polyline';
import { COLORS } from './Theme';

// Haversine formula for distance in km
export const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Nearest neighbor waypoint optimization algorithm
export const optimizeWaypoints = (points) => {
  if (!points || points.length <= 2) return points;
  let start = points[0];
  let unvisited = points.slice(1);
  let optimized = [start];
  let current = start;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDist = getDistanceKm(current.latitude, current.longitude, unvisited[0].latitude, unvisited[0].longitude);
    for (let i = 1; i < unvisited.length; i++) {
      let dist = getDistanceKm(current.latitude, current.longitude, unvisited[i].latitude, unvisited[i].longitude);
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

// Default region: UPQ (Universidad Politécnica de Querétaro)
const DEFAULT_REGION = {
  latitude: 20.5891,
  longitude: -100.4376,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

import { reverseGeocode } from '../src/api/locationApi';

// In-memory cache for calculated routes by coordinate key
const routeCache = new Map();
let rateLimitCooldownUntil = 0;

const generateWaypointKey = (points) => {
  if (!points || !Array.isArray(points)) return '';
  return points
    .map(p => `${Number(p.latitude).toFixed(5)},${Number(p.longitude).toFixed(5)}`)
    .join('|');
};

export default function MapaRutas({
  waypoints = [],
  interactive = false,
  onMapPress,
  routeCoords: customRouteCoords = [],
  showRoute = true,
  height = 250,
  initialRegion = DEFAULT_REGION,
  style,
}) {
  const [routeCoords, setRouteCoords] = useState(customRouteCoords);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const lastProcessedKeyRef = React.useRef('');
  const mapRef = React.useRef(null);

  const waypointKey = generateWaypointKey(waypoints);

  // Synchronize customRouteCoords or fetch route when coordinate key changes
  // NOTE: we use customRouteCoords.length (not the array itself) as a dependency
  // to avoid infinite loops caused by a new [] literal being passed on every render.
  const customRouteCoordsLen = customRouteCoords ? customRouteCoords.length : 0;
  useEffect(() => {
    if (customRouteCoords && customRouteCoords.length > 0) {
      setRouteCoords(customRouteCoords);
      lastProcessedKeyRef.current = 'custom';
    } else if (showRoute && waypoints && waypoints.length >= 2) {
      if (lastProcessedKeyRef.current !== waypointKey) {
        lastProcessedKeyRef.current = waypointKey;
        fetchRoute(waypoints, waypointKey);
      }
    } else {
      // Only clear if the waypointKey actually changed (not on every render)
      if (lastProcessedKeyRef.current !== '') {
        setRouteCoords([]);
      }
      lastProcessedKeyRef.current = '';
    }

    // Auto-center camera on the latest active waypoint if interactive or updated
    if (mapRef.current && waypoints && waypoints.length > 0) {
      const targetPoint = waypoints[waypoints.length - 1];
      if (targetPoint?.latitude && targetPoint?.longitude) {
        mapRef.current.animateToRegion({
          latitude: targetPoint.latitude,
          longitude: targetPoint.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }, 800);
      }
    }
  }, [waypointKey, customRouteCoordsLen, showRoute]);

  const fetchRoute = async (points, key) => {
    if (!points || points.length < 2) return;

    // 1. Check in-memory cache
    if (routeCache.has(key)) {
      setRouteCoords(routeCache.get(key));
      return;
    }

    const optimized = optimizeWaypoints(points);
    const fallbackCoords = optimized.map(p => ({ latitude: p.latitude, longitude: p.longitude }));

    // 2. Check 429 rate limit cooldown
    if (Date.now() < rateLimitCooldownUntil) {
      console.warn('GraphHopper API in 429 cooldown period. Using direct points fallback.');
      setRouteCoords(fallbackCoords);
      return;
    }

    setIsLoadingRoute(true);
    const apiKey = '9890f506-bf03-45e8-884c-0f8d8bbf46fd';
    
    try {
      const MAX_POINTS_PER_REQUEST = 5;
      let allCoords = [];
      
      // Chunking: Send requests in segments to avoid GraphHopper's 5-point limit on the free tier
      for (let i = 0; i < optimized.length - 1; i += (MAX_POINTS_PER_REQUEST - 1)) {
        const chunk = optimized.slice(i, i + MAX_POINTS_PER_REQUEST);
        const pointsQuery = chunk
          .map(p => `point=${p.latitude},${p.longitude}`)
          .join('&');
          
        const url = `https://graphhopper.com/api/1/route?${pointsQuery}&profile=car&locale=es&calc_points=true&key=${apiKey}`;
        const response = await axios.get(url);
        
        const encodedPolyline = response.data.paths[0].points;
        const decoded = polyline.decode(encodedPolyline);
        const chunkCoords = decoded.map(point => ({
          latitude: point[0],
          longitude: point[1],
        }));
        
        // Remove overlapping start point from subsequent chunks to avoid duplicate vertex
        if (i > 0 && chunkCoords.length > 0) {
          chunkCoords.shift();
        }
        
        allCoords = [...allCoords, ...chunkCoords];
      }
      
      // Save to cache
      routeCache.set(key, allCoords);
      setRouteCoords(allCoords);
    } catch (error) {
      if (error.response?.status === 429) {
        rateLimitCooldownUntil = Date.now() + 60000; // 60s cooldown
        console.warn('GraphHopper API rate limit hit (HTTP 429). Entering 60s cooldown and using direct points fallback.');
      } else {
        console.log('GraphHopper API fallback to direct points:', error.message);
      }
      setRouteCoords(fallbackCoords);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const handlePress = async (e) => {
    if (interactive && onMapPress) {
      const coord = e.nativeEvent.coordinate;
      // Perform reverse geocoding to update address text
      const address = await reverseGeocode(coord.latitude, coord.longitude);
      onMapPress({
        latitude: coord.latitude,
        longitude: coord.longitude,
        address: address,
      });
    }
  };

  const getMarkerColor = (index, total) => {
    if (index === 0) return 'green';
    if (index === total - 1) return 'red';
    return 'orange';
  };

  return (
    <View style={[styles.container, { height }, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType="standard"
        onPress={handlePress}
        initialRegion={initialRegion}
      >
        {waypoints.map((point, index) => (
          <Marker
            key={`wp-${index}-${point.latitude}-${point.longitude}`}
            coordinate={{ latitude: point.latitude, longitude: point.longitude }}
            title={point.title || (index === 0 ? 'Inicio (Origen)' : index === waypoints.length - 1 ? 'Destino Final' : `Parada ${index}`)}
            description={point.description}
            pinColor={point.color || getMarkerColor(index, waypoints.length)}
          />
        ))}

        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={COLORS.primary || '#00aaff'}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>

      {isLoadingRoute && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Trazando ruta óptima...</Text>
        </View>
      )}

      {interactive && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>Toca en el mapa para fijar tu ubicación</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    elevation: 3,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  hintContainer: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  hintText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
