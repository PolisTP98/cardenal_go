import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import Mapa from '../components/Mapa';

export default function PantallaConductor() {
  const [viajesBD, setViajesBD] = useState([]);
  const [viajeSeleccionado, setViajeSeleccionado] = useState(null);

  useEffect(() => {
    const viajesFalsosBD = [
      {
        id: 1,
        pasajero: "Carlos Gómez",
        tarifa: "$85.00",
        puntos: [{ latitude: 20.5934, longitude: -100.3812 }, { latitude: 20.6150, longitude: -100.4020 }],
        coordenadasRuta: [{ latitude: 20.5934, longitude: -100.3812 }, { latitude: 20.6050, longitude: -100.3900 }, { latitude: 20.6150, longitude: -100.4020 }]
      },
      {
        id: 2,
        pasajero: "Ana María",
        tarifa: "$120.00",
        puntos: [{ latitude: 20.5820, longitude: -100.3620 }, { latitude: 20.5610, longitude: -100.3910 }],
        coordenadasRuta: [{ latitude: 20.5820, longitude: -100.3620 }, { latitude: 20.5710, longitude: -100.3750 }, { latitude: 20.5610, longitude: -100.3910 }]
      }
    ];
    setViajesBD(viajesFalsosBD);
  }, []);

  const aceptarViaje = () => {
    if (!viajeSeleccionado) return;
    Alert.alert("Viaje Aceptado", `Has aceptado el viaje de ${viajeSeleccionado.pasajero}. ¡Ve por él!`);
  };

  return (
    <View style={estilos.contenedor}>
      
      <Mapa 
        puntos={viajeSeleccionado ? viajeSeleccionado.puntos : []}
        coordenadasRuta={viajeSeleccionado ? viajeSeleccionado.coordenadasRuta : []}
        esInteractivo={false}
      />

      <View style={estilos.contenedorLista}>
        <Text style={estilos.tituloSeccion}>Viajes Disponibles (BD)</Text>
        <FlatList
          data={viajesBD}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[estilos.tarjetaViaje, viajeSeleccionado?.id === item.id && estilos.tarjetaSeleccionada]}
              onPress={() => setViajeSeleccionado(item)}
            >
              <Text style={estilos.pasajeroViaje}>{item.pasajero}</Text>
              <Text style={estilos.tarifaViaje}>Gana: {item.tarifa}</Text>
              <Text style={estilos.detallesViaje}>Toca para trazar ruta</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {viajeSeleccionado && (
        <View style={estilos.contenedorBotones}>
          <TouchableOpacity style={[estilos.botonAccion, estilos.botonAzul]} onPress={aceptarViaje}>
            <Text style={estilos.textoBoton}>Aceptar Viaje ({viajeSeleccionado.tarifa})</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[estilos.botonAccion, estilos.botonRojo]} onPress={() => setViajeSeleccionado(null)}>
            <Text style={estilos.textoBoton}>Descartar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#fff' },
  contenedorLista: { position: 'absolute', top: 50, left: 0, right: 0, paddingHorizontal: 20 },
  tituloSeccion: { fontSize: 16, fontWeight: 'bold', color: '#fff', backgroundColor: 'rgba(0,0,0,0.6)', padding: 5, borderRadius: 5, alignSelf: 'flex-start', marginBottom: 10 },
  tarjetaViaje: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginRight: 15, width: 200, elevation: 4 },
  tarjetaSeleccionada: { borderColor: '#007AFF', borderWidth: 2 },
  pasajeroViaje: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  tarifaViaje: { fontSize: 15, color: '#4CD964', fontWeight: 'bold', marginTop: 2 },
  detallesViaje: { fontSize: 12, color: '#999', marginTop: 5 },
  contenedorBotones: { position: 'absolute', bottom: 30, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  botonAccion: { flex: 1, marginHorizontal: 5, paddingVertical: 15, borderRadius: 25, alignItems: 'center', elevation: 3 },
  botonAzul: { backgroundColor: '#007AFF' },
  botonRojo: { backgroundColor: '#FF3B30' },
  textoBoton: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});