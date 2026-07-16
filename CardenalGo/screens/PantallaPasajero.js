import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';
import polyline from '@mapbox/polyline';
import Mapa from '../components/Mapa';

const obtenerDistancia = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

const optimizarPuntos = (puntosLista) => {
  if (puntosLista.length <= 2) return puntosLista;
  let inicio = puntosLista[0]; 
  let noVisitados = puntosLista.slice(1);
  let optimizados = [inicio];
  let actual = inicio;

  while (noVisitados.length > 0) {
    let indiceMasCercano = 0;
    let distMinima = obtenerDistancia(actual.latitude, actual.longitude, noVisitados[0].latitude, noVisitados[0].longitude);
    for (let i = 1; i < noVisitados.length; i++) {
      let dist = obtenerDistancia(actual.latitude, actual.longitude, noVisitados[i].latitude, noVisitados[i].longitude);
      if (dist < distMinima) {
        distMinima = dist;
        indiceMasCercano = i;
      }
    }
    actual = noVisitados[indiceMasCercano];
    optimizados.push(actual);
    noVisitados.splice(indiceMasCercano, 1); 
  }
  return optimizados;
};

export default function PantallaPasajero() {
  const [puntos, setPuntos] = useState([]);
  const [coordenadasRuta, setCoordenadasRuta] = useState([]);
  const [estaCargando, setEstaCargando] = useState(false);
  const [rutaCalculada, setRutaCalculada] = useState(false);

  const manejarPresionMapa = (evento) => {
    if (!estaCargando && !rutaCalculada) {
      setPuntos([...puntos, evento.nativeEvent.coordinate]);
    }
  };

  const limpiarMapa = () => {
    setPuntos([]);
    setCoordenadasRuta([]);
    setRutaCalculada(false);
  };

  const calcularRuta = async () => {
    if (puntos.length < 2) {
      Alert.alert("Aviso", "Necesitas al menos el punto de origen y destino.");
      return;
    }

    setEstaCargando(true);
    const puntosOptimizados = optimizarPuntos(puntos);
    setPuntos(puntosOptimizados); 

    const apiKey = '9890f506-bf03-45e8-884c-0f8d8bbf46fd'; 
    const consultaPuntos = puntosOptimizados.map(p => `point=${p.latitude},${p.longitude}`).join('&');
    const url = `https://graphhopper.com/api/1/route?${consultaPuntos}&profile=car&locale=es&calc_points=true&key=${apiKey}`;

    try {
      const respuesta = await axios.get(url);
      const lineaDecodificada = respuesta.data.paths[0].points;
      const decodificado = polyline.decode(lineaDecodificada);
      const coordenadas = decodificado.map(punto => ({ latitude: punto[0], longitude: punto[1] }));
      
      setCoordenadasRuta(coordenadas);
      setRutaCalculada(true);
    } catch (error) {
      Alert.alert("Error", "No se pudo trazar la ruta. Intenta marcar puntos sobre calles conocidas.");
    } finally {
      setEstaCargando(false);
    }
  };

  const enviarSolicitud = () => {
    Alert.alert("Éxito", "Tu solicitud de viaje ha sido enviada a los conductores cercanos.");
  };

  return (
    <View style={estilos.contenedor}>
      <Mapa 
        puntos={puntos}
        coordenadasRuta={coordenadasRuta}
        alPresionarMapa={manejarPresionMapa}
        esInteractivo={!rutaCalculada} 
      />

      <View style={estilos.tarjetaInfo}>
        <Text style={estilos.tituloTarjeta}>¿A dónde vas?</Text>
        <Text style={estilos.textoTarjeta}>
          {rutaCalculada 
            ? "Ruta lista. Revisa los detalles abajo." 
            : `Puntos seleccionados: ${puntos.length}\n1. Toca para marcar origen.\n2. Toca para marcar destino.`}
        </Text>
      </View>

      <View style={estilos.contenedorBotones}>
        {!rutaCalculada && puntos.length >= 2 && (
          <TouchableOpacity style={[estilos.botonAccion, estilos.botonAzul]} onPress={calcularRuta} disabled={estaCargando}>
            <Text style={estilos.textoBoton}>{estaCargando ? "Calculando..." : "Calcular Ruta"}</Text>
          </TouchableOpacity>
        )}

        {rutaCalculada && (
          <TouchableOpacity style={[estilos.botonAccion, estilos.botonVerde]} onPress={enviarSolicitud}>
            <Text style={estilos.textoBoton}>Pedir Cardenal Go</Text>
          </TouchableOpacity>
        )}

        {puntos.length > 0 && (
          <TouchableOpacity style={[estilos.botonAccion, estilos.botonRojo]} onPress={limpiarMapa}>
            <Text style={estilos.textoBoton}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#fff' },
  tarjetaInfo: { position: 'absolute', top: 50, left: 20, right: 20, backgroundColor: 'white', padding: 15, borderRadius: 15, elevation: 5 },
  tituloTarjeta: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  textoTarjeta: { fontSize: 14, color: '#666', marginTop: 5 },
  contenedorBotones: { position: 'absolute', bottom: 30, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  botonAccion: { flex: 1, marginHorizontal: 5, paddingVertical: 15, borderRadius: 25, alignItems: 'center', elevation: 3 },
  botonAzul: { backgroundColor: '#007AFF' },
  botonVerde: { backgroundColor: '#4CD964' },
  botonRojo: { backgroundColor: '#FF3B30' },
  textoBoton: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});