import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';

export default function NewPasswordScreen({ navigation }) {
    return (
        <View style={styles.container}>
        <TopHeader showBack onBackPress={() => navigation.goBack()} />
        <View style={styles.content}>
            <Text style={styles.title}>Nueva contraseña</Text>
            <Text style={styles.description}>
            Crea una nueva contraseña segura para tu cuenta.
            </Text>

            <CustomInput 
            label="Nueva contraseña" 
            placeholder="Ingresa tu nueva contraseña" 
            secureTextEntry
            />
            <CustomInput 
            label="Confirmar contraseña" 
            placeholder="Repite tu contraseña" 
            secureTextEntry
            />

            <View style={styles.requirementsBox}>
            <Text style={styles.reqTitle}>Requisitos de seguridad:</Text>
            <Text style={styles.reqItem}>• Mínimo 8 caracteres</Text>
            <Text style={styles.reqItem}>• Al menos un número</Text>
            <Text style={styles.reqItem}>• Al menos un símbolo (ej. @, #, $, !)</Text>
            </View>

            <PrimaryButton 
            title="Actualizar contraseña" 
            onPress={() => navigation.navigate('PasswordSuccess')} 
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
        marginBottom: 32
    },
    requirementsBox: {
        backgroundColor: '#F3F4F6',
        padding: 16,
        borderRadius: SIZES.radius,
        marginBottom: 32
    },
    reqTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8
    },
    reqItem: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 4
    },
    button: {
        marginTop: 10
    },
});