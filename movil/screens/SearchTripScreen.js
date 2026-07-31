import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import Card from '../components/Card';

import LocationSearchInput from '../components/LocationSearchInput';
import MapaRutas from '../components/MapaRutas';

export default function SearchTripScreen({ navigation }) {
  const [origen, setOrigen] = useState('UPQ');
  const [destino, setDestino] = useState('');
  const [origenValid, setOrigenValid] = useState(true);
  const [destinoValid, setDestinoValid] = useState(false);
  const [origenCoords, setOrigenCoords] = useState({ latitude: 20.5891, longitude: -100.4376 });
  const [destinoCoords, setDestinoCoords] = useState(null);
  const [selectingTarget, setSelectingTarget] = useState('destino');
  
  // Prefill with today's date formatted as YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState(todayStr);

  const handleSearch = () => {
    if (!origen || !destino) {
      Alert.alert('Campos requeridos', 'Por favor ingresa un origen y un destino para buscar viajes.');
      return;
    }
    if (!origenValid || !destinoValid) {
      Alert.alert('Ubicación inválida', 'Por favor selecciona una ubicación sugerida para tu origen y destino.');
      return;
    }

    // Navigate to results screen with search filters
    navigation.navigate('TripResults', {
      origen,
      destino,
      fecha,
      lat_destino: destinoCoords?.latitude,
      lng_destino: destinoCoords?.longitude,
    });
  };

  // Coordenadas para mostrar en el mapa — memoized to avoid creating a new
  // array reference on every render (which would trigger an infinite loop in MapaRutas)
  const waypoints = useMemo(() => {
    const pts = [];
    if (origenCoords) pts.push({ coords: origenCoords, type: 'origen', latitude: origenCoords.latitude, longitude: origenCoords.longitude });
    if (destinoCoords) pts.push({ coords: destinoCoords, type: 'destino', latitude: destinoCoords.latitude, longitude: destinoCoords.longitude });
    return pts;
  }, [
    origenCoords?.latitude,
    origenCoords?.longitude,
    destinoCoords?.latitude,
    destinoCoords?.longitude,
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <TopHeader title="Buscar Viaje" showBack onBackPress={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>¿A dónde vas hoy?</Text>
          <Text style={styles.subtitle}>Encuentra conductores que se dirigen a tu mismo destino.</Text>

          <Card style={styles.searchCard}>
            <LocationSearchInput
              label="Punto de Origen"
              placeholder="Ej. UPQ o dirección de salida"
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
              label="Destino Principal"
              placeholder="¿A qué colonia o lugar vas?"
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

          <CustomInput
            label="Fecha del Viaje (YYYY-MM-DD)"
            placeholder="Ej. 2026-07-20"
            value={fecha}
            onChangeText={setFecha}
          />

          <PrimaryButton
            title="Buscar Viajes Disponibles"
            onPress={handleSearch}
            style={styles.searchBtn}
          />
        </Card>
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  searchCard: {
    padding: 16,
  },
  searchBtn: {
    marginTop: 12,
  },
  selectorModeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  selectorLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  selectorBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
  },
  modeBtnActive: {
    backgroundColor: COLORS.primary + '20',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  modeBtnTextActive: {
    color: COLORS.primary,
  }
});