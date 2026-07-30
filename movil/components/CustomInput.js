import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from './Theme';

export default function CustomInput({ label, placeholder, isPassword, secureTextEntry, value, onChangeText, style, keyboardType, editable = true, maxLength }) {
    const [isSecure, setIsSecure] = useState(isPassword || secureTextEntry);

    return (
        <View style={[styles.container, style]}>
        {label && <Text style={styles.label}>{label}</Text>}
        <View style={styles.inputContainer}>
            <TextInput
                style={[styles.input, !editable && styles.disabledInput]}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={isSecure}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType || 'default'}
                editable={editable}
                maxLength={maxLength}
            />
            {isPassword && (
                <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setIsSecure(!isSecure)}
                >
                    <Ionicons
                        name={isSecure ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={COLORS.textSecondary}
                    />
                </TouchableOpacity>
            )}
        </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        color: COLORS.text,
        marginBottom: 8,
        fontWeight: '500',
    },
    inputContainer: {
        position: 'relative',
        justifyContent: 'center',
    },
    input: {
        backgroundColor: COLORS.inputBackground,
        borderRadius: SIZES.radius,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    disabledInput: {
        backgroundColor: '#E2E8F0',
        color: '#64748B',
    },
    eyeIcon: {
        position: 'absolute',
        right: 16,
        padding: 4,
    },
});