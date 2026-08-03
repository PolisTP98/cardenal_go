export const VEHICLE_COLORS = [
  { name: 'Blanco', hex: '#FFFFFF' },
  { name: 'Negro', hex: '#000000' },
  { name: 'Gris', hex: '#808080' },
  { name: 'Plata', hex: '#C0C0C0' },
  { name: 'Rojo', hex: '#DC2626' },
  { name: 'Azul', hex: '#2563EB' },
  { name: 'Azul Marino', hex: '#1E3A8A' },
  { name: 'Verde', hex: '#16A34A' },
  { name: 'Amarillo', hex: '#EAB308' },
  { name: 'Naranja', hex: '#F97316' },
  { name: 'Cafe', hex: '#92400E' },
  { name: 'Beige', hex: '#FEF3C7' },
  { name: 'Dorado', hex: '#CA8A04' },
];

export const getVehicleColorHex = (colorName) => {
  const color = VEHICLE_COLORS.find(c => c.name.toLowerCase() === (colorName || '').toLowerCase());
  return color ? color.hex : '#CCCCCC'; // Default for unrecognized colors
};
