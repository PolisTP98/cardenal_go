import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';

export default function Mapa({ puntos, coordenadasRuta, alPresionarMapa, esInteractivo = true }) {
  
  const obtenerColorMarcador = (indice, totalPuntos) => {
    if (indice === 0) return "green";
    if (indice === totalPuntos - 1) return "red";
    return "orange";
  };

  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={StyleSheet.absoluteFillObject}
      mapType="standard"
      onPress={esInteractivo ? alPresionarMapa : null}
      initialRegion={{
        latitude: 20.5934,
        longitude: -100.3812,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }}
    >
      {puntos && puntos.map((punto, indice) => (
        <Marker 
          key={indice} 
          coordinate={punto} 
          title={indice === 0 ? "Inicio" : indice === puntos.length - 1 ? "Destino" : `Parada ${indice}`} 
          pinColor={obtenerColorMarcador(indice, puntos.length)} 
        />
      ))}

      {coordenadasRuta && coordenadasRuta.length > 0 && (
        <Polyline
          coordinates={coordenadasRuta}
          strokeColor="#00aaff"
          strokeWidth={5}
          lineCap="round"
          lineJoin="round"
        />
      )}
    </MapView>
  );
}