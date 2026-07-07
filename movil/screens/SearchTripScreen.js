import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import PrimaryButton from '../components/PrimaryButton';
import Card from '../components/Card';

export default function SearchTripScreen({ navigation }) {
    return (
        <View style={styles.container}>
        <TopHeader title="Cardenal GO" />
        <ScrollView contentContainerStyle={styles.content}>
            
            <Card style={styles.searchCard}>
            <Text style={styles.sectionTitle}>¿A dónde vas?</Text>
            <View style={styles.inputMock}>
                <Ionicons name="radio-button-on" size={20} color={COLORS.textSecondary} />
                <Text style={styles.inputText}>UPQ</Text>
            </View>
            <View style={styles.inputMock}>
                <Ionicons name="location-outline" size={20} color={COLORS.primary} />
                <Text style={styles.inputText}>Destino</Text>
            </View>
            <View style={styles.row}>
                <View style={[styles.inputMock, { flex: 1, marginRight: 8 }]}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
                <Text style={styles.inputText}>Hoy 14:30</Text>
                </View>
                <View style={[styles.inputMock, { flex: 1, marginLeft: 8 }]}>
                <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
                <Text style={styles.inputText}>1 Pasajero</Text>
                </View>
            </View>
            <PrimaryButton 
                title="Buscar viajes" 
                onPress={() => navigation.navigate('TripResults')} 
                style={{ marginTop: 10 }}
            />
            </Card>

            <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Viajes sugeridos</Text>
            <Text style={styles.seeAll}>Ver todos</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Card style={styles.suggestedCard}>
                <Text style={styles.time}>Salida 14:45</Text>
                <Text style={styles.price}>$35</Text>
                <Text style={styles.driver}>Carlos M. ⭐ 4.9</Text>
                <Text style={styles.seats}>2 asientos</Text>
            </Card>
            <Card style={styles.suggestedCard}>
                <Text style={styles.time}>Salida 15:10</Text>
                <Text style={styles.price}>$30</Text>
                <Text style={styles.driver}>Ana S. ⭐ 5.0</Text>
                <Text style={styles.seats}>1 asiento</Text>
            </Card>
            </ScrollView>
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
    searchCard: { 
        padding: 20 
    },
    sectionTitle: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: COLORS.text, 
        marginBottom: 16 
    },
    inputMock: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: COLORS.inputBackground, 
        padding: 12, 
        borderRadius: SIZES.radius, 
        marginBottom: 12 
    },
    inputText: { 
        marginLeft: 10, 
        fontSize: 16, 
        color: COLORS.text 
    },
    row: { 
        flexDirection: 'row', 
        justifyContent: 'space-between' 
    },
    sectionHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: 24, 
        marginBottom: 12 
    },
    seeAll: { 
        color: COLORS.primary, 
        fontWeight: '600' 
    },
    suggestedCard: { 
        width: 150, 
        marginRight: 16, 
        padding: 16 
    },
    time: { 
        fontSize: 14, 
        color: COLORS.textSecondary, 
        marginBottom: 8 
    },
    price: { 
        fontSize: 20, 
        fontWeight: 'bold', 
        color: COLORS.text, 
        marginBottom: 8 
    },
    driver: { 
        fontSize: 12, 
        color: COLORS.text, 
        marginBottom: 4 
    },
    seats: { 
        fontSize: 12, 
        color: COLORS.success 
    },
});