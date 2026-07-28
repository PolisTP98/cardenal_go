import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import LoadingOverlay from '../components/LoadingOverlay';
import Card from '../components/Card';
import { useAuth } from '../src/context/AuthContext';
import { registrarConductor, registrarVehiculo } from '../src/api/usuariosApi';

export default function DriverRegistrationScreen({ navigation }) {
  const { user, updateRole } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [phone, setPhone] = useState('');
  const [license, setLicense] = useState('');
  
  const [plate, setPlate] = useState('');
  const [color, setColor] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');

  const nextStep = () => {
    if (step === 1) {
      if (!phone || !license) {
        Alert.alert('Campos faltantes', 'Por favor ingresa tu teléfono y licencia.');
        return;
      }
      if (phone.length < 10) {
        Alert.alert('Teléfono inválido', 'Por favor ingresa un número de teléfono válido (mínimo 10 dígitos).');
        return;
      }
      setStep(2);
    }
  };

  const handleRegistration = async () => {
    if (!plate || !color || !model || !year) {
      Alert.alert('Campos faltantes', 'Por favor completa todos los campos del vehículo.');
      return;
    }

    const numericYear = parseInt(year);
    if (isNaN(numericYear) || numericYear < 1991 || numericYear > new Date().getFullYear() + 1) {
      Alert.alert('Año inválido', 'El año del vehículo debe estar entre 1991 y el año actual + 1.');
      return;
    }

    setLoading(true);
    try {
      // 1. Registrar Conductor
      const conductorData = {
        id_usuario: user.id,
        telefono: phone,
        licencia_conducir: license,
        url_foto_ine: 'ine_placeholder.png', // INE dummy image
      };
      const conductor = await registrarConductor(conductorData);

      // 2. Registrar Vehículo
      const vehiculoData = {
        id_conductor: conductor.id,
        placa: plate.toUpperCase(),
        color,
        modelo: model,
        anio: numericYear,
        fotos: ['car_placeholder.png'], // default car image
      };
      await registrarVehiculo(vehiculoData);

      // 3. Actualizar Rol en Contexto y Guardar, luego navegar al DriverDashboard
      await updateRole('Conductor', () => {
        Alert.alert('¡Felicidades!', 'Te has registrado exitosamente como conductor. Bienvenido.', [
          {
            text: 'Comenzar',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'DriverDashboard' }],
              });
            }
          }
        ]);
      });
    } catch (error) {
      Alert.alert('Error de registro', error.displayMessage || 'Ocurrió un error al registrar tus datos de conductor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopHeader 
        title="Registro de Conductor" 
        showBack 
        onBackPress={() => {
          if (step === 2) {
            setStep(1);
          } else if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('PassengerDashboard');
          }
        }} 
      />
      <LoadingOverlay visible={loading} message="Registrando conductor y vehículo..." />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Ofrece viajes compartidos</Text>
          <Text style={styles.subtitle}>Completa tu perfil de conductor para empezar a publicar rutas en la UPQ.</Text>

          <View style={styles.stepsIndicator}>
            <View style={[styles.stepItem, step === 1 && styles.stepActive]}>
              <Text style={[styles.stepText, step === 1 && styles.stepTextActive]}>1. Personal</Text>
            </View>
            <View style={[styles.stepItem, step === 2 && styles.stepActive]}>
              <Text style={[styles.stepText, step === 2 && styles.stepTextActive]}>2. Vehículo</Text>
            </View>
          </View>

          {step === 1 ? (
            <Card>
              <Text style={styles.sectionTitle}>Información del Conductor</Text>
              <CustomInput
                label="Número de Teléfono"
                placeholder="Ej. 4421234567"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
              <CustomInput
                label="Número de Licencia de Conducir"
                placeholder="Ej. LIC-44829A"
                value={license}
                onChangeText={setLicense}
              />
              <PrimaryButton title="Continuar" onPress={nextStep} style={styles.btn} />
            </Card>
          ) : (
            <Card>
              <Text style={styles.sectionTitle}>Detalles del Vehículo</Text>
              <CustomInput
                label="Placa del Vehículo"
                placeholder="Ej. UKP-12-34"
                value={plate}
                onChangeText={setPlate}
              />
              <CustomInput
                label="Color"
                placeholder="Ej. Rojo"
                value={color}
                onChangeText={setColor}
              />
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <CustomInput
                    label="Modelo / Marca"
                    placeholder="Ej. Nissan Versa"
                    value={model}
                    onChangeText={setModel}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <CustomInput
                    label="Año"
                    placeholder="Ej. 2020"
                    keyboardType="numeric"
                    value={year}
                    onChangeText={setYear}
                  />
                </View>
              </View>
              <PrimaryButton title="Finalizar Registro" onPress={handleRegistration} style={styles.btn} />
            </Card>
          )}
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
    marginBottom: 20,
    lineHeight: 20,
  },
  stepsIndicator: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  stepItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  stepActive: {
    borderBottomWidth: 2,
    borderColor: COLORS.primary,
  },
  stepText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  stepTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  btn: {
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
  },
});