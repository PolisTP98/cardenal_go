import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';

export default function DriverRegistrationScreen({ navigation }) {
    return (
        <View style={styles.container}>
        <TopHeader title="Cardenal GO" showBack onBackPress={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Registro de conductor</Text>
            <Text style={styles.subtitle}>Completa tu perfil para ofrecer viajes</Text>
            
            <View style={styles.steps}>
            <Text style={styles.stepActive}>1 Personal</Text>
            <Text style={styles.stepInactive}>2 Vehículo</Text>
            <Text style={styles.stepInactive}>3 Fotografías</Text>
            </View>

            <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Información personal</Text>
            
            <CustomInput 
                label="Nombre completo" 
                placeholder="Juan Pérez" 
            />
            <CustomInput 
                label="Número de teléfono" 
                placeholder="+52 (442) 000 0000" 
                keyboardType="phone-pad"
            />
            <CustomInput 
                label="Número de la licencia de conducir" 
                placeholder="e.g., A1234567" 
            />
            </View>

            <PrimaryButton 
            title="Continuar" 
            onPress={() => navigation.goBack()} 
            style={styles.buttonSpacing} 
            />
        </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background
    },
    content: {
        padding: SIZES.padding
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 24
    },
    steps: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border
    },
    stepActive: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.primary,
        borderBottomWidth: 2,
        borderBottomColor: COLORS.primary,
        paddingBottom: 8,
        flex: 1,
        textAlign: 'center'
    },
    stepInactive: {
        fontSize: 14,
        color: COLORS.textSecondary,
        paddingBottom: 8,
        flex: 1,
        textAlign: 'center'
    },
    formSection: {
        marginBottom: 20
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 16
    },
    buttonSpacing: {
        marginTop: 20
    },
});