import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import LoadingOverlay from '../components/LoadingOverlay';
import Card from '../components/Card';
import { useAuth } from '../src/context/AuthContext';
import { getConductorByUsuario, getVehiculos } from '../src/api/usuariosApi';
import { crearViaje, UPQ_COORDS } from '../src/api/viajesApi';
import LocationSearchInput from '../components/LocationSearchInput';
import MapaRutas from '../components/MapaRutas';

export default function PublishTripScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [vehicle, setVehicle] = useState(null);

  // Form Fields & Coordinates
  const [origen, setOrigen] = useState('UPQ (Universidad Politécnica de Querétaro)');
  const [destino, setDestino] = useState('Centro Histórico de Querétaro');
  const [origenValid, setOrigenValid] = useState(true);
  const [destinoValid, setDestinoValid] = useState(true);
  const [origenCoords, setOrigenCoords] = useState({ latitude: 20.5891, longitude: -100.4376 });
  const [destinoCoords, setDestinoCoords] = useState({ latitude: 20.5888, longitude: -100.3899 });
  const [selectingTarget, setSelectingTarget] = useState('destino'); // 'origen' | 'destino'
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [asientos, setAsientos] = useState('3');
  // Dynamic pricing handled by passengers now, so precio is fixed to 0 at trip creation
  const [precio, setPrecio] = useState('0');

  const waypoints = useMemo(() => [
    { ...origenCoords, title: `Origen: ${origen}`, color: 'green' },
    { ...destinoCoords, title: `Destino: ${destino}`, color: 'red' },
  ], [origenCoords, destinoCoords, origen, destino]);

  useEffect(() => {
    const checkConductorAndVehicle = async () => {
      try {
        const conductor = await getConductorByUsuario(user.id);
        const vehiculosList = await getVehiculos(conductor.id);
        if (vehiculosList && vehiculosList.length > 0) {
          setVehicle(vehiculosList[0]);
        } else {
          Alert.alert('Vehículo requerido', 'Debes registrar un vehículo para poder publicar un viaje.', [
            { text: 'Ir a Registro', onPress: () => navigation.navigate('DriverRegistration') },
            { text: 'Cancelar', onPress: () => navigation.goBack() }
          ]);
        }
      } catch (err) {
        Alert.alert('Perfil incompleto', 'No pudimos verificar tus datos de conductor.', [
          { text: 'Registrar', onPress: () => navigation.navigate('DriverRegistration') },
          { text: 'Atrás', onPress: () => navigation.goBack() }
        ]);
      } finally {
        setLoading(false);
      }
    };

    checkConductorAndVehicle();

    // Prefill date with today's date formatted as YYYY-MM-DD
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setFecha(formattedDate);
    
    // Prefill time with current time + 1 hour (HH:MM)
    const future = new Date(today.getTime() + 60 * 60 * 1000);
    const hours = String(future.getHours()).padStart(2, '0');
    const minutes = String(future.getMinutes()).padStart(2, '0');
    setHora(`${hours}:${minutes}`);
  }, []);

  const handlePublish = async () => {
    if (!origen || !destino || !fecha || !hora || !asientos) {
      Alert.alert('Campos incompletos', 'Por favor llena todos los campos del viaje.');
      return;
    }
    
    if (!origenValid || !destinoValid) {
      Alert.alert('Ubicación inválida', 'Por favor selecciona una ubicación sugerida o válida en el mapa para el origen y destino.');
      return;
    }

    // Basic date/time format validations
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(fecha)) {
      Alert.alert('Formato de fecha incorrecto', 'Usa el formato YYYY-MM-DD.');
      return;
    }

    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(hora)) {
      Alert.alert('Formato de hora incorrecto', 'Usa el formato HH:MM.');
      return;
    }

    const numericSeats = parseInt(asientos);
    if (isNaN(numericSeats) || numericSeats <= 0 || numericSeats > 4) {
      Alert.alert('Asientos inválidos', 'Por seguridad, el número de asientos debe ser entre 1 y 4.');
      return;
    }

    const numericPrice = 0; // Dynamic pricing calculated per passenger request

    if (!vehicle) {
      Alert.alert('Vehículo no seleccionado', 'Registra un vehículo para continuar.');
      return;
    }

    setSubmitting(true);
    try {
      const tripData = {
        id_vehiculo: vehicle.id,
        id_estatus: 1, // Programado
        ubicacion_inicio: {
          type: 'Point',
          coordinates: [origenCoords.longitude, origenCoords.latitude],
        }, 
        ubicacion_destino: {
          type: 'Point',
          coordinates: [destinoCoords.longitude, destinoCoords.latitude],
        },
        nombre_origen: origen,
        nombre_destino: destino,
        precio_sugerido: numericPrice,
        fecha: fecha,
        hora_inicio: `${hora}:00`, // Include seconds
        asientos_totales: numericSeats,
      };

      await crearViaje(tripData);

      Alert.alert('¡Viaje Publicado!', 'Tu viaje se encuentra listo para recibir solicitudes de pasajeros.', [
        { text: 'Genial', onPress: () => navigation.navigate('DriverDashboard') }
      ]);
    } catch (err) {
      Alert.alert('Error al publicar', err.displayMessage || 'Ocurrió un error al registrar el viaje.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando datos del conductor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopHeader title="Publicar Viaje" showBack onBackPress={() => navigation.goBack()} />
      <LoadingOverlay visible={submitting} message="Publicando viaje..." />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Crea una nueva ruta</Text>
          <Text style={styles.subtitle}>Comparte los gastos de tu trayecto y ayuda a tus compañeros.</Text>

          {vehicle && (
            <Card style={styles.vehicleCard}>
              <View style={styles.vehicleRow}>
                <Ionicons name="car-sport" size={24} color={COLORS.primary} />
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleTitle}>{vehicle.modelo} ({vehicle.color})</Text>
                  <Text style={styles.vehiclePlate}>Placa: {vehicle.placa}</Text>
                </View>
              </View>
            </Card>
          )}

          <Card style={{ zIndex: 20 }}>
            <Text style={styles.sectionTitle}>Ruta del Viaje</Text>
            <LocationSearchInput
              label="Origen"
              placeholder="Ej. UPQ o tu dirección de salida"
              value={origen}
              onChangeText={(txt) => {
                setOrigen(txt);
                setOrigenValid(false);
              }}
              iconName="navigate-circle-outline"
              iconColor="green"
              style={{ zIndex: 20 }}
              onSelectLocation={(loc) => {
                setOrigen(loc.address || loc.name);
                setOrigenCoords({ latitude: loc.latitude, longitude: loc.longitude });
                setOrigenValid(true);
              }}
            />
            <LocationSearchInput
              label="Destino"
              placeholder="¿A dónde vas?"
              value={destino}
              onChangeText={(txt) => {
                setDestino(txt);
                setDestinoValid(false);
              }}
              iconName="location-sharp"
              iconColor="red"
              style={{ zIndex: 10 }}
              onSelectLocation={(loc) => {
                setDestino(loc.address || loc.name);
                setDestinoCoords({ latitude: loc.latitude, longitude: loc.longitude });
                setDestinoValid(true);
              }}
            />

            <View style={styles.selectorModeRow}>
              <Text style={styles.selectorLabel}>Toca el mapa para definir:</Text>
              <View style={styles.selectorBtns}>
                <TouchableOpacity
                  style={[styles.modeBtn, selectingTarget === 'origen' && styles.modeBtnActive]}
                  onPress={() => setSelectingTarget('origen')}
                >
                  <Text style={[styles.modeBtnText, selectingTarget === 'origen' && styles.modeBtnTextActive]}>🟢 Origen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, selectingTarget === 'destino' && styles.modeBtnActive]}
                  onPress={() => setSelectingTarget('destino')}
                >
                  <Text style={[styles.modeBtnText, selectingTarget === 'destino' && styles.modeBtnTextActive]}>🔴 Destino</Text>
                </TouchableOpacity>
              </View>
            </View>

            <MapaRutas
              interactive={true}
              height={220}
              waypoints={waypoints}
              onMapPress={(loc) => {
                if (selectingTarget === 'origen') {
                  setOrigenCoords({ latitude: loc.latitude, longitude: loc.longitude });
                  if (loc.address) {
                    setOrigen(loc.address);
                    setOrigenValid(true);
                  }
                } else {
                  setDestinoCoords({ latitude: loc.latitude, longitude: loc.longitude });
                  if (loc.address) {
                    setDestino(loc.address);
                    setDestinoValid(true);
                  }
                }
              }}
            />
          </Card>

        <Card>
          <Text style={styles.sectionTitle}>Agenda y Capacidad</Text>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <CustomInput
                label="Fecha (YYYY-MM-DD)"
                placeholder="Ej. 2026-07-20"
                value={fecha}
                onChangeText={setFecha}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <CustomInput
                label="Hora (HH:MM)"
                placeholder="Ej. 14:30"
                value={hora}
                onChangeText={setHora}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <CustomInput
                label="Asientos Disponibles (Max 4)"
                placeholder="Ej. 3"
                keyboardType="numeric"
                value={asientos}
                onChangeText={setAsientos}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <View style={styles.dynamicPriceInfo}>
                <Ionicons name="cash-outline" size={18} color={COLORS.primary} />
                <Text style={styles.dynamicPriceText}>
                  La tarifa se calculará automáticamente por pasajero según su distancia.
                </Text>
              </View>
            </View>
          </View>
        </Card>

        <PrimaryButton
          title="Publicar Viaje"
          onPress={handlePublish}
          style={styles.publishBtn}
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SIZES.padding,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  vehicleCard: {
    padding: 12,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleInfo: {
    marginLeft: 12,
  },
  vehicleTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  vehiclePlate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  publishBtn: {
    marginTop: 8,
    marginBottom: 24,
  },
  selectorModeRow: {
    marginVertical: 8,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  selectorBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  modeBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modeBtnTextActive: {
    color: '#FFF',
  },
  dynamicPriceInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  dynamicPriceText: {
    flex: 1,
    fontSize: 11,
    color: '#0369A1',
    marginLeft: 6,
    lineHeight: 14,
  }
});