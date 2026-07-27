import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from './Theme';

export default function EmptyState({ icon = 'document-text-outline', title, description }) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color={COLORS.textSecondary} style={styles.icon} />
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SIZES.padding * 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 32,
  },
  icon: {
    marginBottom: 16,
    opacity: 0.7,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
});
