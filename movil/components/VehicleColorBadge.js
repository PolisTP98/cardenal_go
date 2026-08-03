import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getVehicleColorHex } from './VehicleColors';
import { COLORS } from './Theme';

const VehicleColorBadge = ({ colorName, style, textStyle }) => {
  const hexCode = getVehicleColorHex(colorName);
  const displayName = colorName || 'Desconocido';

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.circle, { backgroundColor: hexCode }]} />
      <Text style={[styles.text, textStyle]} numberOfLines={1}>
        {displayName}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  circle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  text: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
});

export default VehicleColorBadge;
