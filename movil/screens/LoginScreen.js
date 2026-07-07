import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SIZES } from '../components/Theme';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';

export default function LoginScreen({ navigation }) {
    const [form, setForm] = useState({ matricula: '', password: '' });

    return (
        <View style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.logo}>CARDENAL GO</Text>
            <Text style={styles.description}>Movilidad segura y oficial para la comunidad de la UPQ</Text>
        </View>

        <CustomInput 
            label="Matrícula" 
            placeholder="Ej. 123456789" 
            keyboardType="numeric"
            value={form.matricula}
            onChangeText={(txt) => setForm({ ...form, matricula: txt })}
        />

        <CustomInput 
            label="Contraseña" 
            placeholder="********" 
            secureTextEntry 
            value={form.password}
            onChangeText={(txt) => setForm({ ...form, password: txt })}
        />

        <View style={styles.optionsContainer}>
            <View style={styles.rememberMe}>
            <TouchableOpacity style={styles.checkbox}></TouchableOpacity>
            <Text style={styles.optionText}>Recordarme</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
        </View>

        <PrimaryButton 
            title="Iniciar sesión" 
            onPress={() => navigation.navigate('Home')} 
            style={styles.button}
        />

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>¿No tienes cuenta? <Text style={styles.linkBold}>Registrarse</Text></Text>
        </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: COLORS.background, 
        padding: SIZES.padding, 
        justifyContent: 'center' 
    },
    header: { 
        alignItems: 'center', 
        marginBottom: 40 
    },
    logo: { 
        fontSize: 32, 
        fontWeight: 'bold', 
        color: COLORS.primary, 
        marginBottom: 8 
    },
    description: { 
        fontSize: 14, 
        color: COLORS.textSecondary, 
        textAlign: 'center', 
        paddingHorizontal: 20 
    },
    optionsContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24 
    },
    rememberMe: { 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    checkbox: { 
        width: 18, 
        height: 18, 
        borderWidth: 1, 
        borderColor: COLORS.border, 
        borderRadius: 4, 
        marginRight: 8 
    },
    optionText: { 
        fontSize: 14, 
        color: COLORS.textSecondary 
    },
    forgotText: { 
        fontSize: 14, 
        color: '#3B82F6' 
    },
    button: { 
        marginBottom: 16 
    },
    linkText: { 
        fontSize: 14, 
        color: COLORS.textSecondary, 
        textAlign: 'center' 
    },
    linkBold: { 
        color: COLORS.primary, 
        fontWeight: 'bold' 
    },
});