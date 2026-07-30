import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../components/Theme';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import LoadingOverlay from '../components/LoadingOverlay';
import { login as loginApi } from '../src/api/authApi';
import { useAuth } from '../src/context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!matricula || !password) {
      Alert.alert('Campos incompletos', 'Por favor ingresa tu matrícula y contraseña.');
      return;
    }

    if (matricula.length !== 9) {
      Alert.alert('Matrícula inválida', 'La matrícula debe ser de 9 dígitos.');
      return;
    }

    setLoading(true);
    try {
      const response = await loginApi(matricula, password);
      // Guardar sesión en Context & Secure Store
      await login(response);
    } catch (error) {
      const errorMsg = error.displayMessage || 'Credenciales inválidas o error de conexión.';
      Alert.alert('Error de inicio de sesión', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <LoadingOverlay visible={loading} message="Iniciando sesión..." />

          <View style={styles.header}>
            <Image
              source={require('../assets/Logo_cardenal.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.description}>Movilidad segura y oficial para la comunidad de la UPQ</Text>
          </View>

          <CustomInput
            label="Matrícula"
            placeholder="Ej. 123456789"
            keyboardType="numeric"
            value={matricula}
            onChangeText={setMatricula}
          />

          <CustomInput
            label="Contraseña"
            placeholder="********"
            isPassword={true}
            value={password}
            onChangeText={setPassword}
          />

          <View style={styles.optionsContainer}>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </View>

          <PrimaryButton
            title="Iniciar Sesión"
            onPress={handleLogin}
            style={styles.button}
          />

          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>
              ¿No tienes cuenta? <Text style={styles.linkBold}>Registrarse</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: SIZES.padding,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoImage: {
    width: 160,
    height: 160,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  button: {
    marginBottom: 20,
    elevation: 3,
  },
  linkText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  linkBold: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});