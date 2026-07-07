import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';

export default function TripResultsScreen({ navigation }) {
    return (
        <View style={styles.container}>
        <TopHeader 
            showBack 
            onBackPress={() => navigation.goBack()} 
            title="Cardenal GO" 
            rightIcon={() => (
                <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                    <Ionicons name="person-outline" size={24} color={COLORS.primary} />
                </TouchableOpacity>
            )}
        />
        
        <View style={styles.headerInfo}>
            <Text style={styles.route}>Centro histórico → UPQ</Text>
            <Text style={styles.date}>Hoy, 14:30</Text>
        </View>

        <View style={styles.filters}>
            <TouchableOpacity style={styles.filterChip}><Text style={styles.filterText}>Más temprano</Text></TouchableOpacity>
            <TouchableOpacity style={styles.filterChip}><Text style={styles.filterText}>Menor precio</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.list}>
            <Card style={styles.resultCard}>
            <View style={styles.cardRow}>
                <View>
                <Text style={styles.timeText}>14:35</Text>
                <Text style={styles.timeTextDest}>15:20</Text>
                </View>
                <View style={styles.details}>
                <Text style={styles.driverName}>Carlos M. ⭐ 4.9</Text>
                <Text style={styles.carInfo}>Nissan Versa Blanco</Text>
                <Text style={styles.major}>UPQ Sistemas Computacionales</Text>
                <Text style={styles.availability}>3 lugares disponibles</Text>
                </View>
                <Text style={styles.price}>$35</Text>
            </View>
            <PrimaryButton title="Solicitar viaje" onPress={() => navigation.navigate('ActiveTrip')} style={styles.requestBtn} />
            </Card>

            <Card style={styles.resultCard}>
            <View style={styles.cardRow}>
                <View>
                <Text style={styles.timeText}>14:45</Text>
                <Text style={styles.timeTextDest}>15:30</Text>
                </View>
                <View style={styles.details}>
                <Text style={styles.driverName}>Ana P. ⭐ 4.7</Text>
                <Text style={styles.carInfo}>Chevrolet Spark Plata</Text>
                <Text style={styles.major}>UPQ Negocios Internacionales</Text>
                <Text style={styles.availabilityAlert}>1 lugar disponible</Text>
                </View>
                <Text style={styles.price}>$30</Text>
            </View>
            <PrimaryButton title="Solicitar viaje" onPress={() => navigation.navigate('ActiveTrip')} style={styles.requestBtn} />
            </Card>
        </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background
    },
    headerInfo: {
        padding: SIZES.padding,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderColor: COLORS.border
    },
    route: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text
    },
    date: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 4
    },
    filters: {
        flexDirection: 'row',
        padding: SIZES.padding
    },
    filterChip: {
        backgroundColor: COLORS.inputBackground,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8
    },
    filterText: {
        fontSize: 14,
        color: COLORS.textSecondary
    },
    list: {
        padding: SIZES.padding
    },
    resultCard: {
        padding: 16
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16
    },
    timeText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text
    },
    timeTextDest: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginTop: 24
    },
    details: {
        flex: 1,
        paddingHorizontal: 16
    },
    driverName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text
    },
    carInfo: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 4
    },
    major: {
        fontSize: 12,
        color: COLORS.textSecondary
    },
    availability: {
        fontSize: 12,
        color: COLORS.success,
        marginTop: 8,
        fontWeight: '600'
    },
    availabilityAlert: {
        fontSize: 12,
        color: COLORS.warning,
        marginTop: 8,
        fontWeight: '600'
    },
    price: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary
    },
    requestBtn: {
        paddingVertical: 12
    },
});