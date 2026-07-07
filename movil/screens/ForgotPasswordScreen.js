import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';

export default function ForgotPasswordScreen({ navigation }) {
    return (
        <View style={styles.container}>
        <TopHeader showBack onBackPress={() => navigation.goBack()} />
        <View style={styles.content}>
            <Text style={styles.title}>Recuperar contraseña</Text>
            <Text style={styles.description}>
            Ingresa tu matrícula para recibir un código de verificación en tu correo institucional.
            </Text>

            <CustomInput 
            label="Matrícula" 
            placeholder="Ej. 120034567" 
            keyboardType="numeric"
            />
            <Text style={styles.helperText}>Debe contener 9 dígitos numéricos.</Text>

            <PrimaryButton 
            title="Enviar código" 
            onPress={() => navigation.navigate('VerifyCode')} 
            style={styles.button}
            />
        </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background
    },
    content: {
        padding: SIZES.padding,
        flex: 1
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 12,
        marginTop: 20
    },
    description: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 32,
        lineHeight: 20
    },
    helperText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: -8,
        marginBottom: 32
    },
    button: {
        marginTop: 10
    },
});