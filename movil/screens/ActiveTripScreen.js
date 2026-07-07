import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../components/Theme';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';

export default function ActiveTripScreen({ navigation }) {
    return (
        <View style={styles.container}>
        <View style={styles.mapPlaceholder}>
            <Ionicons name="map-outline" size={60} color={COLORS.textSecondary} />
            <Text style={styles.mapText}>Simulación de Mapa Activo</Text>
        </View>

        <ScrollView style={styles.bottomSheet} contentContainerStyle={styles.bottomSheetContent}>
            <View style={styles.tripStatusRow}>
            <View>
                <Text style={styles.statusTitle}>🟢 En camino a UPQ</Text>
                <Text style={styles.etaText}>Llegada estimada: 12 minutos</Text>
            </View>
            <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>7.2 km</Text>
            </View>
            </View>

            <Pressable style={styles.driverCard} onPress={() => navigation.navigate('Chat')}>
            <View style={styles.driverInfo}>
                <View style={styles.avatar}><Text style={styles.avatarText}>JP</Text></View>
                <View>
                <Text style={styles.driverName}>Juan Pérez</Text>
                <Text style={styles.carInfo}>VW Jetta Blanco • UMQ-1234</Text>
                </View>
            </View>
            <View style={styles.ratingBadge}><Text style={styles.ratingText}>⭐ 4.9</Text></View>
            </Pressable>

            <Text style={styles.sectionTitle}>PASAJEROS (3/4)</Text>
            
            <View style={styles.passengerList}>
            <View style={[styles.passengerItem, styles.passengerActive]}>
                <View style={styles.avatarSmall}><Text style={styles.avatarTextSmall}>Tú</Text></View>
                <Text style={styles.passengerName}>Ana Gómez</Text>
                <Text style={styles.passengerStatusOk}>A bordo</Text>
            </View>
            
            <View style={styles.passengerItem}>
                <View style={styles.avatarSmall}><Text style={styles.avatarTextSmall}>LS</Text></View>
                <Text style={styles.passengerName}>Luis Sánchez</Text>
                <Text style={styles.passengerStatusPending}>Próxima parada</Text>
            </View>
            </View>

            <PrimaryButton 
            title="Llegué a la parada" 
            onPress={() => navigation.navigate('Rating')} 
            style={styles.actionButton}
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
    mapPlaceholder: {
        flex: 1,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center'
    },
    mapText: {
        color: COLORS.textSecondary,
        marginTop: 10,
        fontWeight: 'bold'
    },
    bottomSheet: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -20
    },
    bottomSheetContent: {
        padding: SIZES.padding
    },
    tripStatusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingVertical: 10
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text
    },
    etaText: {
        fontSize: 14,
        color: COLORS.primary,
        marginTop: 4,
        fontWeight: '600'
    },
    distanceBadge: {
        backgroundColor: COLORS.inputBackground,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16
    },
    distanceText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: 'bold'
    },
    driverCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
    },
    driverInfo: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    avatarText: {
        fontWeight: 'bold',
        color: COLORS.textSecondary
    },
    driverName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text
    },
    carInfo: {
        fontSize: 12,
        color: COLORS.textSecondary
    },
    ratingBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8
    },
    ratingText: {
        color: '#D97706',
        fontSize: 12,
        fontWeight: 'bold'
    },
    sectionTitle: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 10
    },
    passengerList: {
        marginBottom: 20
    },
    passengerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: COLORS.border
    },
    passengerActive: {
        backgroundColor: '#F3F4F6',
        borderRadius: SIZES.radius,
        paddingHorizontal: 12,
        borderBottomWidth: 0,
        marginBottom: 8
    },
    avatarSmall: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    avatarTextSmall: {
        color: COLORS.surface,
        fontSize: 10,
        fontWeight: 'bold'
    },
    passengerName: {
        flex: 1,
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500'
    },
    passengerStatusOk: {
        fontSize: 12,
        color: COLORS.success,
        fontWeight: 'bold'
    },
    passengerStatusPending: {
        fontSize: 12,
        color: COLORS.textSecondary
    },
    actionButton: {
        marginTop: 10
    },
});