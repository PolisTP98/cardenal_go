import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from './Theme';

export default function PrimaryButton({ title, onPress, style, textStyle }) {
    return (
        <TouchableOpacity style={[styles.button, style]} onPress={onPress} activeOpacity={0.8}>
        <Text style={[styles.text, textStyle]}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: { 
        backgroundColor: COLORS.primary, 
        paddingVertical: 16, 
        borderRadius: SIZES.radius, 
        alignItems: 'center', 
        justifyContent: 'center', 
        width: '100%',
    },
    text: { 
        color: COLORS.surface, 
        fontSize: 16, 
        fontWeight: '600', 
    }, 
});