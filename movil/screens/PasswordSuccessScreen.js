import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../components/Theme';
import PrimaryButton from '../components/PrimaryButton';

export default function PasswordSuccessScreen({ navigation }) {
    return (
        <View style={styles.container}>
        <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={100} color={COLORS.success} />
        </View>
        
        <Text style={styles.title}>Contraseña actualizada</Text>
        <Text style={styles.description}>
            Tu contraseña ha sido restablecida correctamente. Ahora puedes iniciar sesión con tus nuevas credenciales.
        </Text>

        <PrimaryButton 
            title="Iniciar sesión" 
            onPress={() => navigation.navigate('Login')} 
            style={styles.button}
        />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: COLORS.background, 
        padding: SIZES.padding, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    iconContainer: { 
        marginBottom: 32 
    },
    title: { 
        fontSize: 24, 
        fontWeight: 'bold', 
        color: COLORS.text, 
        marginBottom: 16, 
        textAlign: 'center' 
    },
    description: { 
        fontSize: 16, 
        color: COLORS.textSecondary, 
        textAlign: 'center', 
        marginBottom: 40, 
        paddingHorizontal: 20, 
        lineHeight: 24 
    },
    button: { 
        width: '100%' 
    },
});