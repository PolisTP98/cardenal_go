import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import Card from '../components/Card';

export default function PublishTripScreen({ navigation }) {
    return (
        <View style={styles.container}>
        <TopHeader title="Publicar viaje" showBack onBackPress={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.callout}>¡Hay que darnos una mano entre Cardenales!</Text>
            
            <View style={styles.steps}>
            <Text style={[styles.stepActive]}>1 Ruta</Text>
            <Text style={styles.stepInactive}>2 Tiempo</Text>
            <Text style={styles.stepInactive}>3 Asientos</Text>
            <Text style={styles.stepInactive}>4 Reseña</Text>
            </View>

            <Card>
            <Text style={styles.sectionTitle}>Detalle de la ruta</Text>
            <CustomInput label="Origen" placeholder="Universidad Politécnica de Querétaro" />
            <CustomInput label="Destino" placeholder="¿A dónde vas?" />
            </Card>

            <Card>
            <Text style={styles.sectionTitle}>Agendar</Text>
            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}><CustomInput label="Fecha" placeholder="mm/dd/yyyy" /></View>
                <View style={{ flex: 1, marginLeft: 8 }}><CustomInput label="Hora de salida" placeholder="--:--" /></View>
            </View>
            </Card>

            <Card>
            <Text style={styles.sectionTitle}>Capacidad y tarifa</Text>
            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}><CustomInput label="Asientos disponibles" placeholder="3" keyboardType="numeric" /></View>
                <View style={{ flex: 1, marginLeft: 8 }}><CustomInput label="Contribución sugerida" placeholder="$ 25" keyboardType="numeric" /></View>
            </View>
            <Text style={styles.infoText}>Calculada con IA. Según las tarifas estándar de la UPQ para rutas.</Text>
            </Card>

            <PrimaryButton title="Publicar viaje" onPress={() => navigation.navigate('Home')} style={{ marginTop: 10 }} />
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
    callout: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 16
    },
    steps: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20
    },
    stepActive: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.primary,
        borderBottomWidth: 2,
        borderBottomColor: COLORS.primary,
        paddingBottom: 4
    },
    stepInactive: {
        fontSize: 14,
        color: COLORS.textSecondary,
        paddingBottom: 4
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 12
    },
    row: {
        flexDirection: 'row'
    },
    infoText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: -8,
        marginBottom: 8
    },
});