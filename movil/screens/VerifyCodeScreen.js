import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';

export default function VerifyCodeScreen({ navigation }) {
    return (
        <View style={styles.container}>
        <TopHeader title="Cardenal GO" showBack onBackPress={() => navigation.goBack()} />
        <View style={styles.content}>
            <Text style={styles.title}>Verificar código</Text>
            <Text style={styles.description}>
            Hemos enviado un código de 6 dígitos a tu correo electrónico
            </Text>
            <Text style={styles.emailText}>...@upq.edu.mx</Text>

            <CustomInput 
            placeholder="------" 
            keyboardType="numeric"
            style={styles.codeInput}
            />

            <PrimaryButton 
            title="Verificar" 
            onPress={() => navigation.navigate('NewPassword')} 
            style={styles.button}
            />

            <View style={styles.resendContainer}>
            <Text style={styles.resendPrompt}>¿No lo recibiste? </Text>
            <TouchableOpacity>
                <Text style={styles.resendLink}>Reenviar código</Text>
            </TouchableOpacity>
            </View>
            <Text style={styles.spamNotice}>Revisa tu carpeta de spam.</Text>
        </View>
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
        flex: 1,
        alignItems: 'center'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 12,
        marginTop: 20
    },
    description: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 20
    },
    emailText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 32,
        marginTop: 4
    },
    codeInput: {
        width: '50%',
        marginBottom: 32
    },
    button: {
        width: '100%',
        marginBottom: 24
    },
    resendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    },
    resendPrompt: {
        fontSize: 14,
        color: COLORS.textSecondary
    },
    resendLink: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: 'bold'
    },
    spamNotice: {
        fontSize: 12,
        color: COLORS.textSecondary
    },
});