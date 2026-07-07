import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import PrimaryButton from '../components/PrimaryButton';
import Card from '../components/Card';

export default function RatingScreen({ navigation }) {
    const [rating, setRating] = useState(0);

    return (
        <View style={styles.container}>
        <TopHeader title="Cardenal GO" showBack onBackPress={() => navigation.navigate('Home')} />
        <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>¿Cómo estuvo tu viaje?</Text>
            <Text style={styles.subtitle}>Toyota Yaris Blanco • UPQ-2023</Text>
            <Text style={styles.driver}>Carlos D.</Text>

            <Card style={styles.cardCenter}>
            <Text style={styles.cardTitle}>Califica al conductor</Text>
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Ionicons 
                    name={star <= rating ? "star" : "star-outline"} 
                    size={40} 
                    color={star <= rating ? "#FBBF24" : COLORS.border} 
                    />
                </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.cardTitle}>¿Qué destacó?</Text>
            <View style={styles.tagsContainer}>
                <View style={styles.tag}><Text style={styles.tagText}>Puntualidad</Text></View>
                <View style={styles.tag}><Text style={styles.tagText}>Limpieza</Text></View>
                <View style={styles.tag}><Text style={styles.tagText}>Conducción</Text></View>
                <View style={styles.tag}><Text style={styles.tagText}>Comunicación</Text></View>
            </View>
            </Card>

            <Text style={styles.label}>Comentarios adicionales (opcional)</Text>
            <TextInput
            style={styles.textArea}
            placeholder="Escribe aquí..."
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={4}
            />

            <PrimaryButton 
            title="Enviar calificación" 
            onPress={() => navigation.navigate('Home')} 
            style={styles.submitBtn} 
            />
            
            <TouchableOpacity onPress={() => navigation.navigate('Report')}>
            <Text style={styles.reportText}>Reportar un problema</Text>
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
        padding: SIZES.padding,
        alignItems: 'center'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
        textAlign: 'center'
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 4
    },
    driver: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 24
    },
    cardCenter: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 24
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 16
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 32
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8
    },
    tag: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8
    },
    tagText: {
        color: COLORS.textSecondary,
        fontSize: 14
    },
    label: {
        alignSelf: 'flex-start',
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
        marginTop: 20,
        marginBottom: 10
    },
    textArea: {
        width: '100%',
        backgroundColor: COLORS.inputBackground,
        borderRadius: SIZES.radius,
        padding: 16,
        height: 100,
        textAlignVertical: 'top',
        color: COLORS.text,
        marginBottom: 24
    },
    submitBtn: {
        width: '100%',
        marginBottom: 16
    },
    reportText: {
        color: COLORS.danger,
        fontWeight: 'bold',
        fontSize: 14
    },
});