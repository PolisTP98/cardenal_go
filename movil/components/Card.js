import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, SIZES } from './Theme';

export default function Card({ children, style }) {
    return (
        <View style={[styles.card, style]}>
        {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        shadowColor: '#000',
        shadowOffset: {
        width: 0,
        height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 3.84,
        elevation: 2,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
});