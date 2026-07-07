import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import Card from '../components/Card';

export default function ProfileScreen({ navigation }) {
    return (
        <View style={styles.container}>
        <TopHeader title="Cardenal GO" />
        <ScrollView contentContainerStyle={styles.content}>
            
            <View style={styles.profileHeader}>
            <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>JP</Text></View>
            <Text style={styles.name}>Juan Pérez</Text>
            <Text style={styles.matricula}>Matrícula: 123456789</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>Student</Text></View>
            </View>

            <View style={styles.statsContainer}>
            <Card style={styles.statCard}>
                <Text style={styles.statValue}>4.8</Text>
                <Text style={styles.statLabel}>Calificación promedio</Text>
            </Card>
            <Card style={styles.statCard}>
                <Text style={styles.statValue}>42</Text>
                <Text style={styles.statLabel}>Viajes tomados</Text>
            </Card>
            </View>

            <TouchableOpacity 
            style={styles.driverBanner} 
            activeOpacity={0.9}
            onPress={() => navigation.navigate('DriverRegistration')}
            >
            <Text style={styles.bannerTitle}>Conviértete en un conductor</Text>
            <Text style={styles.bannerSub}>Comparte tu ruta con la comunidad de la UPQ</Text>
            <View style={styles.bannerButton}><Text style={styles.bannerBtnText}>Registrarse</Text></View>
            </TouchableOpacity>

            <Card style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem}>
                <Text style={styles.menuText}>Editar perfil</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('TripHistory')}>
                <Text style={styles.menuText}>Historial de viajes</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem}>
                <Text style={styles.menuText}>Configuración de seguridad</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            </Card>

            <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
            </TouchableOpacity>

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
    profileHeader: {
        alignItems: 'center',
        marginBottom: 20
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10
    },
    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.textSecondary
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text
    },
    matricula: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 8
    },
    badge: {
        backgroundColor: '#E0E7FF',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12
    },
    badgeText: {
        color: '#4F46E5',
        fontSize: 12,
        fontWeight: 'bold'
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 4
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'center'
    },
    driverBanner: {
        backgroundColor: COLORS.primary,
        padding: 20,
        borderRadius: SIZES.radius,
        alignItems: 'center',
        marginBottom: 20
    },
    bannerTitle: {
        color: COLORS.surface,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8
    },
    bannerSub: {
        color: COLORS.surface,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
        opacity: 0.9
    },
    bannerButton: {
        backgroundColor: COLORS.surface,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8
    },
    bannerBtnText: {
        color: COLORS.primary,
        fontWeight: 'bold'
    },
    menuCard: {
        paddingVertical: 0
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12
    },
    menuText: {
        fontSize: 16,
        color: COLORS.text
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginHorizontal: 12
    },
    logoutBtn: {
        borderWidth: 1,
        borderColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: SIZES.radius,
        alignItems: 'center',
        marginTop: 10
    },
    logoutText: {
        color: COLORS.primary,
        fontSize: 16,
        fontWeight: 'bold'
    },
});