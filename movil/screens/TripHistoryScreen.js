import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import Card from '../components/Card';

export default function TripHistoryScreen({ navigation }) {
    return (
        <View style={styles.container}>
        <TopHeader title="Historial de viajes" showBack onBackPress={() => navigation.goBack()} />
        
        <View style={styles.tabs}>
            <Text style={styles.tabActive}>Todos</Text>
            <Text style={styles.tabInactive}>Como Conductor</Text>
            <Text style={styles.tabInactive}>Como Pasajero</Text>
        </View>

        <ScrollView contentContainerStyle={styles.list}>
            
            {/* Viaje Finalizado */}
            <Text style={styles.dateLabel}>Finalizado</Text>
            <Card style={styles.historyCard}>
            <Text style={styles.timeText}>Hoy, 08:30 AM</Text>
            <View style={styles.routeContainer}>
                <Text style={styles.location}>Terminal de autobuses</Text>
                <Text style={styles.location}>↓</Text>
                <Text style={styles.location}>UPQ</Text>
            </View>
            <View style={styles.driverInfo}>
                <Text style={styles.driverName}>Juan Pérez (Conductor)</Text>
                <Text style={styles.carDetails}>Volkswagen Jetta Blanco UQK-123</Text>
            </View>
            <View style={styles.priceContainer}>
                <Text style={styles.price}>$25.00</Text>
                <Text style={styles.priceLabel}>Aportación</Text>
            </View>
            </Card>

            {/* Viaje Próximo */}
            <Text style={styles.dateLabel}>Próximo</Text>
            <Card style={styles.historyCard}>
            <Text style={styles.timeText}>Mañana, 14:15 PM</Text>
            <View style={styles.routeContainer}>
                <Text style={styles.location}>UPQ</Text>
                <Text style={styles.location}>↓</Text>
                <Text style={styles.location}>Centro Histórico</Text>
            </View>
            <Text style={styles.driverName}>3 Pasajeros confirmados</Text>
            <Text style={styles.linkText}>Ver detalles</Text>
            <View style={styles.priceContainer}>
                <Text style={styles.price}>$75.00</Text>
                <Text style={styles.priceLabel}>Ingreso est.</Text>
            </View>
            </Card>

            {/* Viaje Cancelado */}
            <Text style={styles.dateLabel}>Cancelado</Text>
            <Card style={[styles.historyCard, styles.cancelledCard]}>
            <Text style={styles.timeText}>Ayer, 18:00 PM</Text>
            <View style={styles.routeContainer}>
                <Text style={styles.location}>Plaza del Parque</Text>
                <Text style={styles.location}>↓</Text>
                <Text style={styles.location}>UPQ</Text>
            </View>
            <Text style={styles.driverName}>María García (Conductor)</Text>
            <Text style={styles.errorText}>Viaje cancelado por el conductor</Text>
            </Card>

            <Text style={styles.footerText}>No hay más viajes recientes.</Text>

        </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background
    },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface
    },
    tabActive: {
        flex: 1,
        textAlign: 'center',
        paddingVertical: 16,
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.primary,
        borderBottomWidth: 2,
        borderBottomColor: COLORS.primary
    },
    tabInactive: {
        flex: 1,
        textAlign: 'center',
        paddingVertical: 16,
        fontSize: 14,
        color: COLORS.textSecondary
    },
    list: {
        padding: SIZES.padding
    },
    dateLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
        marginTop: 8
    },
    historyCard: {
        padding: 16
    },
    cancelledCard: {
        opacity: 0.7
    },
    timeText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 8
    },
    routeContainer: {
        marginBottom: 12
    },
    location: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text
    },
    driverInfo: {
        marginBottom: 12
    },
    driverName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text
    },
    carDetails: {
        fontSize: 12,
        color: COLORS.textSecondary
    },
    priceContainer: {
        position: 'absolute',
        right: 16,
        bottom: 16,
        alignItems: 'flex-end'
    },
    price: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary
    },
    priceLabel: {
        fontSize: 12,
        color: COLORS.textSecondary
    },
    linkText: {
        fontSize: 14,
        color: '#3B82F6',
        marginTop: 8,
        fontWeight: '600'
    },
    errorText: {
        fontSize: 12,
        color: COLORS.danger,
        marginTop: 4
    },
    footerText: {
        textAlign: 'center',
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 20
    },
});