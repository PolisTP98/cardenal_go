import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, SIZES } from '../components/Theme';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';

export default function RegisterScreen({ navigation }) {
    const [form, setForm] = useState({ nombre: '', matricula: '', password: '', confirmPassword: '' });

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Cardenal GO</Text>
        <Text style={styles.subtitle}>Crea tu cuenta</Text>
        <Text style={styles.description}>Únete a la comunidad de carpooling de la UPQ</Text>

        <CustomInput 
            label="Nombre completo" 
            placeholder="Ej. Juan Pérez" 
            value={form.nombre}
            onChangeText={(txt) => setForm({ ...form, nombre: txt })}
        />
        
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

        <CustomInput 
            label="Confirmar contraseña" 
            placeholder="********" 
            secureTextEntry 
            value={form.confirmPassword}
            onChangeText={(txt) => setForm({ ...form, confirmPassword: txt })}
        />

        <View style={styles.checkboxContainer}>
            <TouchableOpacity style={styles.checkbox}></TouchableOpacity>
            <Text style={styles.checkboxText}>
            Acepto los términos y condiciones y el aviso de privacidad.
            </Text>
        </View>

        <PrimaryButton 
            title="Registrarse" 
            onPress={() => navigation.navigate('Home')} 
            style={styles.button}
        />

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>¿Ya tienes cuenta? <Text style={styles.linkBold}>Iniciar sesión</Text></Text>
        </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: COLORS.background 
    },
    content: { 
        padding: SIZES.padding, 
        paddingTop: 60, 
        alignItems: 'center' 
    },
    title: { 
        fontSize: 24, 
        fontWeight: 'bold', 
        color: COLORS.primary, 
        marginBottom: 8 
    },
    subtitle: { 
        fontSize: 22, 
        fontWeight: 'bold', 
        color: COLORS.text, 
        marginBottom: 4 
    },
    description: { 
        fontSize: 14, 
        color: COLORS.textSecondary, 
        marginBottom: 24, 
        textAlign: 'center' 
    },
    checkboxContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 24, 
        paddingRight: 20 
    },
    checkbox: { 
        width: 20, 
        height: 20, 
        borderWidth: 1, 
        borderColor: COLORS.border, 
        borderRadius: 4, 
        marginRight: 10 
    },
    checkboxText: { 
        fontSize: 12, 
        color: COLORS.textSecondary 
    },
    button: { 
        marginBottom: 16 
    },
    linkText: { 
        fontSize: 14, 
        color: COLORS.textSecondary 
    },
    linkBold: { 
        color: COLORS.primary, 
        fontWeight: 'bold' 
    },
});