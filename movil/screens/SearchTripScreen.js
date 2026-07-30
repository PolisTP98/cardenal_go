import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import Card from '../components/Card';

import LocationSearchInput from '../components/LocationSearchInput';

export default function SearchTripScreen({ navigation }) {
  const [origen, setOrigen] = useState('UPQ');
  const [destino, setDestino] = useState('');
  const [origenValid, setOrigenValid] = useState(true);
  const [destinoValid, setDestinoValid] = useState(false);
  
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
    });
  };

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
                setDestinoValid(true);
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
});