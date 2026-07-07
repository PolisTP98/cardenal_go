import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SIZES } from './Theme';

export default function TopHeader({ title, showBack, onBackPress, rightIcon }) {
    return (
        <View style={styles.header}>
        <View style={styles.leftContainer}>
            {showBack && (
            <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
                <Text style={styles.backText}>{'<'}</Text>
            </TouchableOpacity>
            )}
        </View>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.rightContainer}>
            {rightIcon && rightIcon()}
        </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SIZES.padding,
        paddingVertical: 16,
        backgroundColor: COLORS.background,
    },
    leftContainer: {
        flex: 1,
        alignItems: 'flex-start',
    },
    rightContainer: {
        flex: 1,
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        flex: 2,
        textAlign: 'center',
    },
    backButton: {
        padding: 8,
    },
    backText: {
        fontSize: 20,
        color: COLORS.primary,
        fontWeight: 'bold',
    },
});