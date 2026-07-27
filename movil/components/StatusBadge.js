import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from './Theme';

export default function StatusBadge({ statusId, type = 'solicitud', text }) {
  let label = text || '';
  let badgeColor = COLORS.textSecondary;
  let textColor = '#FFFFFF';

  if (type === 'solicitud') {
    switch (statusId) {
      case 1:
        label = label || 'Pendiente';
        badgeColor = COLORS.warning;
        textColor = '#1E293B';
        break;
      case 2:
        label = label || 'Negociando';
        badgeColor = '#3B82F6';
        textColor = '#FFFFFF';
        break;
      case 3:
        label = label || 'Aceptada';
        badgeColor = COLORS.success;
        textColor = '#FFFFFF';
        break;
      case 4:
        label = label || 'Rechazada';
        badgeColor = COLORS.danger;
        textColor = '#FFFFFF';
        break;
      case 5:
        label = label || 'Cancelada';
        badgeColor = '#9CA3AF';
        textColor = '#FFFFFF';
        break;
      default:
        label = label || 'Desconocido';
    }
  } else if (type === 'viaje') {
    switch (statusId) {
      case 1:
        label = label || 'Programado';
        badgeColor = '#3B82F6';
        textColor = '#FFFFFF';
        break;
      case 2:
        label = label || 'En curso';
        badgeColor = COLORS.warning;
        textColor = '#1E293B';
        break;
      case 3:
        label = label || 'Finalizado';
        badgeColor = COLORS.success;
        textColor = '#FFFFFF';
        break;
      case 4:
        label = label || 'Cancelado';
        badgeColor = COLORS.danger;
        textColor = '#FFFFFF';
        break;
      default:
        label = label || 'Desconocido';
    }
  }

  return (
    <View style={[styles.badge, { backgroundColor: badgeColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});
