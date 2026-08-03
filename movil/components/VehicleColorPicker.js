import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './Theme';
import { VEHICLE_COLORS } from './VehicleColors';

const VehicleColorPicker = ({ selectedColor, onSelectColor }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Color del Vehículo</Text>
      <View style={styles.grid}>
        {VEHICLE_COLORS.map((item) => {
          const isSelected = selectedColor === item.name;
          return (
            <TouchableOpacity
              key={item.name}
              style={[
                styles.colorItem,
                isSelected && styles.selectedItem
              ]}
              onPress={() => onSelectColor(item.name)}
              activeOpacity={0.7}
            >
              <View style={[styles.colorCircle, { backgroundColor: item.hex }]}>
                {isSelected && (
                  <Ionicons 
                    name="checkmark" 
                    size={16} 
                    color={item.hex === '#FFFFFF' || item.hex === '#FEF3C7' ? '#000' : '#FFF'} 
                  />
                )}
              </View>
              <Text style={[
                styles.colorText,
                isSelected && styles.selectedColorText
              ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorItem: {
    alignItems: 'center',
    width: 64,
    marginBottom: 8,
  },
  selectedItem: {
    // Optionally add a subtle background or scale effect for the selected item
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  colorText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  selectedColorText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  }
});

export default VehicleColorPicker;
