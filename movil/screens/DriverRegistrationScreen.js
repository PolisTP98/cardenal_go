import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import LoadingOverlay from '../components/LoadingOverlay';
import Card from '../components/Card';
import { useAuth } from '../src/context/AuthContext';
import { solicitarSerConductor } from '../src/api/usuariosApi';
import VehicleColorPicker from '../components/VehicleColorPicker';

export default function DriverRegistrationScreen({ navigation, route }) {
  const { user, updateRole } = useAuth();
  const prefill = route?.params?.prefill || {};

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [phone, setPhone] = useState(prefill.telefono || '');
  const [license, setLicense] = useState(prefill.licencia_conducir || '');
  const [facePhoto, setFacePhoto] = useState(null);
  const [inePhoto, setInePhoto] = useState(null);
  
  const [plate, setPlate] = useState(prefill.placa || '');
  const [color, setColor] = useState(prefill.color || '');
  const [model, setModel] = useState(prefill.modelo || '');
  const [year, setYear] = useState(prefill.anio ? String(prefill.anio) : '');
  const [vehiclePhotos, setVehiclePhotos] = useState([]);

  const pickImage = async (type = 'face') => { // 'face', 'ine', or 'vehicle'
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: type !== 'vehicle',
      aspect: type === 'vehicle' ? [4, 3] : (type === 'ine' ? [16, 9] : [1, 1]),
      quality: 0.7,
      allowsMultipleSelection: type === 'vehicle',
    });

    if (!result.canceled) {
      if (type === 'vehicle') {
        setVehiclePhotos([...vehiclePhotos, ...result.assets]);
      } else if (type === 'ine') {
        setInePhoto(result.assets[0]);
      } else {
        setFacePhoto(result.assets[0]);
      }
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!phone || !license || !facePhoto || !inePhoto) {
        Alert.alert('Campos faltantes', 'Por favor ingresa tu teléfono, licencia y las fotografías (rostro e INE).');
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
    if (!plate || !color || !model || !year || !vehiclePhotos) {
      Alert.alert('Campos faltantes', 'Por favor completa todos los campos del vehículo, incluyendo fotografías.');
      return;
    }

    const numericYear = parseInt(year);
    if (isNaN(numericYear) || numericYear < 1991 || numericYear > new Date().getFullYear() + 1) {
      Alert.alert('Año inválido', 'El año del vehículo debe estar entre 1991 y el año actual + 1.');
      return;
    }

    // Normalizar y validar placa (Querétaro)
    const normalizedPlate = plate.toUpperCase().replace(/[\s-]/g, '');
    const queretaroPlateRegex = /^(U[KLMNP][A-Z](\d{3}[A-Z]|\d{4}|\d{3})|S[STUVWXY]\d{4}[A-Z])$/;
    
    if (!queretaroPlateRegex.test(normalizedPlate)) {
      Alert.alert('Placa inválida', 'La placa ingresada no corresponde a un formato válido del Estado de Querétaro.');
      return;
    }

    setLoading(true);
    try {
      // 1. Enviar Solicitud Única (Conductor + Vehículo)
      const solicitudFormData = new FormData();
      solicitudFormData.append('id_usuario', user.id);
      solicitudFormData.append('telefono', phone);
      solicitudFormData.append('licencia_conducir', license);
      solicitudFormData.append('foto_perfil', {
        uri: facePhoto.uri,
        name: facePhoto.fileName || `foto_perfil_${user.id}.jpg`,
        type: 'image/jpeg',
      });
      solicitudFormData.append('foto_ine', {
        uri: inePhoto.uri,
        name: inePhoto.fileName || `foto_ine_${user.id}.jpg`,
        type: 'image/jpeg',
      });
      
      solicitudFormData.append('placa', normalizedPlate);
      solicitudFormData.append('color', color);
      solicitudFormData.append('modelo', model);
      solicitudFormData.append('anio', numericYear);
      
      vehiclePhotos.forEach((photo, index) => {
        solicitudFormData.append('fotos_vehiculo', {
          uri: photo.uri,
          name: photo.fileName || `vehiculo_${index}.jpg`,
          type: 'image/jpeg',
        });
      });

      // API Call
      await solicitarSerConductor(solicitudFormData);

      // 2. Avisar al usuario que está pendiente de revisión
      Alert.alert('Solicitud Enviada', 'Tu solicitud ha sido enviada y está pendiente de revisión administrativa. Te notificaremos cuando seas aprobado.', [
        {
          text: 'Entendido',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'PassengerDashboard' }],
            });
          },
        },
      ]);
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
              <Text style={styles.label}>Fotografía de Rostro</Text>
              <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage('face')}>
                <Ionicons name="camera" size={24} color={COLORS.primary} />
                <Text style={styles.imagePickerText}>
                  {facePhoto ? 'Cambiar fotografía' : 'Seleccionar fotografía'}
                </Text>
              </TouchableOpacity>
              {facePhoto && (
                <Image source={{ uri: facePhoto.uri }} style={styles.previewImage} />
              )}
              
              <Text style={styles.label}>Fotografía de INE (Frente)</Text>
              <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage('ine')}>
                <Ionicons name="card" size={24} color={COLORS.primary} />
                <Text style={styles.imagePickerText}>
                  {inePhoto ? 'Cambiar fotografía de INE' : 'Seleccionar fotografía de INE'}
                </Text>
              </TouchableOpacity>
              {inePhoto && (
                <Image source={{ uri: inePhoto.uri }} style={styles.previewImage} />
              )}
              
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
              <VehicleColorPicker
                selectedColor={color}
                onSelectColor={setColor}
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
              <Text style={styles.label}>Fotografías del Vehículo</Text>
              <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage('vehicle')}>
                <Ionicons name="images" size={24} color={COLORS.primary} />
                <Text style={styles.imagePickerText}>Seleccionar fotografías</Text>
              </TouchableOpacity>
              {vehiclePhotos.length > 0 && (
                <View style={styles.photoGrid}>
                  {vehiclePhotos.map((photo, index) => (
                    <Image key={index} source={{ uri: photo.uri }} style={styles.previewImageSmall} />
                  ))}
                </View>
              )}
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
    color: '#FFF',
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  imagePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  imagePickerText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  previewImageSmall: {
    width: 70,
    height: 70,
    borderRadius: 8,
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