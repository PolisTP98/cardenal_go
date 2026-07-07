import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import PrimaryButton from '../components/PrimaryButton';
import Card from '../components/Card';

export default function ReportScreen({ navigation }) {
    const [selectedReason, setSelectedReason] = useState(0);
    const reasons = ['Comportamiento inadecuado', 'Incumplimiento de ruta', 'Problemas con el vehículo', 'Seguridad'];

    return (
        <View style={styles.container}>
        <TopHeader title="Reportar incidente" showBack onBackPress={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.content}>
            
            <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Viaje con Carlos M.</Text>
            <Text style={styles.infoSubtitle}>Hoy, 08:30 AM • Ruta norte</Text>
            </View>

            <Text style={styles.sectionTitle}>¿Cuál es el motivo del reporte? *</Text>
            <Card style={styles.optionsCard}>
            {reasons.map((reason, index) => (
                <TouchableOpacity 
                key={index} 
                style={styles.radioRow} 
                onPress={() => setSelectedReason(index)}
                >
                <View style={styles.outerRadio}>
                    {selectedReason === index && <View style={styles.innerRadio} />}
                </View>
                <Text style={styles.radioText}>{reason}</Text>
                </TouchableOpacity>
            ))}
            </Card>

            <Text style={styles.sectionTitle}>Descripción detallada *</Text>
            <TextInput
            style={styles.textArea}
            placeholder="Describe lo sucedido con el mayor detalle posible para ayudarnos en la investigación..."
            placeholderTextColor={COLORS.textSecondary}
            multiline
            />

            <Text style={styles.sectionTitle}>Evidencia (opcional)</Text>
            <TouchableOpacity style={styles.uploadBox}>
            <Text style={styles.uploadTitle}>Adjuntar foto o archivo</Text>
            <Text style={styles.uploadSubtitle}>Max 5MB (JPG, PNG, PDF)</Text>
            </TouchableOpacity>

            <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerTitle}>Revisión Institucional</Text>
            <Text style={styles.disclaimerText}>
                Este reporte será enviado directamente y revisado con carácter de confidencialidad por la administración de la Universidad Politécnica de Querétaro. El uso indebido de esta herramienta está penado.
            </Text>
            </View>

            <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <PrimaryButton 
                title="Enviar reporte" 
                onPress={() => navigation.navigate('Home')} 
                style={styles.submitBtn} 
            />
            </View>
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
    infoBox: {
        marginBottom: 20
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text
    },
    infoSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 4
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 12,
        marginTop: 10
    },
    optionsCard: {
        paddingVertical: 8
    },
    radioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12
    },
    outerRadio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    innerRadio: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.primary
    },
    radioText: {
        fontSize: 14,
        color: COLORS.text
    },
    textArea: {
        backgroundColor: COLORS.inputBackground,
        borderRadius: SIZES.radius,
        padding: 16,
        height: 120,
        textAlignVertical: 'top',
        color: COLORS.text,
        marginBottom: 20
    },
    uploadBox: {
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderStyle: 'dashed',
        borderRadius: SIZES.radius,
        padding: 20,
        alignItems: 'center',
        marginBottom: 24,
        backgroundColor: '#FEF2F2'
    },
    uploadTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 4
    },
    uploadSubtitle: {
        fontSize: 12,
        color: COLORS.textSecondary
    },
    disclaimerBox: {
        backgroundColor: '#E0E7FF',
        padding: 16,
        borderRadius: SIZES.radius,
        marginBottom: 24
    },
    disclaimerTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4338CA',
        marginBottom: 8
    },
    disclaimerText: {
        fontSize: 12,
        color: '#4338CA',
        lineHeight: 18
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    cancelBtn: {
        flex: 1,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        borderRadius: SIZES.radius,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    cancelBtnText: {
        color: COLORS.text,
        fontWeight: 'bold',
        fontSize: 16
    },
    submitBtn: {
        flex: 1,
        marginLeft: 8
    },
});