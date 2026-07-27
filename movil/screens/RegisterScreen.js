import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../components/Theme';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import LoadingOverlay from '../components/LoadingOverlay';
import { register } from '../src/api/authApi';

export default function RegisterScreen({ navigation }) {
  const [nombre, setNombre] = useState('');
  const [matricula, setMatricula] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!nombre || !matricula || !email || !password || !confirmPassword) {
      Alert.alert('Campos incompletos', 'Por favor, completa todos los campos.');
      return;
    }

    if (matricula.length !== 9) {
      Alert.alert('Matrícula inválida', 'La matrícula debe ser de 9 dígitos.');
      return;
    }

    if (!email.endsWith('@upq.edu.mx')) {
      Alert.alert('Correo inválido', 'El correo debe ser institucional con terminación @upq.edu.mx');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Contraseña corta', 'La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Contraseñas no coinciden', 'Las contraseñas ingresadas deben ser iguales.');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert('Términos y condiciones', 'Debes aceptar los términos y condiciones para registrarte.');
      return;
    }

    setLoading(true);
    try {
      await register({
        nombre_completo: nombre,
        matricula,
        correo_institucional: email,
        contrasena_raw: password,
        url_foto_perfil: 'cardenal_upq.png',
      });
      Alert.alert('Registro exitoso', 'Tu cuenta ha sido creada. Inicia sesión.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error) {
      Alert.alert('Error de registro', error.displayMessage || 'Ocurrió un error al registrarse.');
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
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <LoadingOverlay visible={loading} message="Creando cuenta..." />

          <Text style={styles.title}>Cardenal GO</Text>
          <Text style={styles.subtitle}>Crea tu cuenta</Text>
          <Text style={styles.description}>Únete a la comunidad de carpooling de la UPQ</Text>

          <CustomInput
            label="Nombre completo"
            placeholder="Ej. Juan Pérez"
            value={nombre}
            onChangeText={setNombre}
          />

          <CustomInput
            label="Matrícula"
            placeholder="Ej. 123456789"
            keyboardType="numeric"
            value={matricula}
            onChangeText={(txt) => {
              setMatricula(txt);
              // Prefiltrar sugerencia de correo institucional para ahorrar tiempo
              if (txt.length === 9 && !email) {
                setEmail(`${txt}@upq.edu.mx`);
              }
            }}
          />

          <CustomInput
            label="Correo Institucional"
            placeholder="matricula@upq.edu.mx"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <CustomInput
            label="Contraseña"
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <CustomInput
            label="Confirmar contraseña"
            placeholder="Repite la contraseña"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
          >
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxActive]}>
              {acceptedTerms && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>
              Acepto los términos y condiciones y el aviso de privacidad.
            </Text>
          </TouchableOpacity>

          <PrimaryButton
            title="Registrarse"
            onPress={handleRegister}
            style={styles.button}
          />

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkButton}>
            <Text style={styles.linkText}>
              ¿Ya tienes cuenta? <Text style={styles.linkBold}>Iniciar sesión</Text>
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
  content: {
    padding: SIZES.padding,
    paddingTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkMark: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  checkboxText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  button: {
    marginBottom: 20,
  },
  linkButton: {
    paddingVertical: 10,
  },
  linkText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  linkBold: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});