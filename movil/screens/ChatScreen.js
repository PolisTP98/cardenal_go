import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';

export default function ChatScreen({ navigation }) {
    const [message, setMessage] = useState('');

    return (
        <View style={styles.container}>
        <TopHeader title="Juan Pérez" showBack onBackPress={() => navigation.goBack()} />
        <View style={styles.subHeader}>
            <Text style={styles.subHeaderText}>Conductor ⭐ 4.8</Text>
        </View>

        <ScrollView contentContainerStyle={styles.chatContainer}>
            <Text style={styles.dateLabel}>Hoy, 8:45 AM</Text>
            
            <View style={[styles.messageBubble, styles.messageLeft]}>
            <Text style={styles.messageTextLeft}>Hola, estoy por llegar a la entrada norte de la UPQ. ¿Estás cerca?</Text>
            </View>

            <Text style={styles.timeLabelRight}>8:46 AM</Text>
            <View style={[styles.messageBubble, styles.messageRight]}>
            <Text style={styles.messageTextRight}>¡Hola! Sí, voy caminando hacia allá.</Text>
            </View>

            <Text style={styles.timeLabelLeft}>8:48 AM</Text>
            <View style={[styles.messageBubble, styles.messageLeft]}>
            <Text style={styles.messageTextLeft}>Perfecto, aquí te espero en un Jetta blanco.</Text>
            </View>

            <Text style={styles.timeLabelRight}>8:49 AM</Text>
            <View style={[styles.messageBubble, styles.messageRight]}>
            <Text style={styles.messageTextRight}>Estoy en camino</Text>
            </View>
        </ScrollView>

        <View style={styles.inputContainer}>
            <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={COLORS.textSecondary}
            value={message}
            onChangeText={setMessage}
            />
            <TouchableOpacity style={styles.sendButton}>
            <Ionicons name="send" size={20} color={COLORS.surface} />
            </TouchableOpacity>
        </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background
    },
    subHeader: {
        alignItems: 'center',
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface
    },
    subHeaderText: {
        fontSize: 14,
        color: COLORS.textSecondary
    },
    chatContainer: {
        padding: SIZES.padding,
        flexGrow: 1,
        justifyContent: 'flex-end'
    },
    dateLabel: {
        textAlign: 'center',
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 16
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 4
    },
    messageLeft: {
        backgroundColor: '#E5E7EB',
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4
    },
    messageRight: {
        backgroundColor: COLORS.primary,
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4
    },
    messageTextLeft: {
        color: COLORS.text,
        fontSize: 15
    },
    messageTextRight: {
        color: COLORS.surface,
        fontSize: 15
    },
    timeLabelLeft: {
        fontSize: 10,
        color: COLORS.textSecondary,
        alignSelf: 'flex-start',
        marginBottom: 12,
        marginLeft: 4
    },
    timeLabelRight: {
        fontSize: 10,
        color: COLORS.textSecondary,
        alignSelf: 'flex-end',
        marginBottom: 12,
        marginRight: 4
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center'
    },
    input: {
        flex: 1,
        backgroundColor: COLORS.inputBackground,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
        marginRight: 12
    },
    sendButton: {
        backgroundColor: COLORS.primary,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center'
    },
});