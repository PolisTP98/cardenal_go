import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getViajesDisponibles } from '../src/api/viajesApi';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';

export default function TripResultsScreen({ route, navigation }) {
  const { destino, fecha, lat_destino, lng_destino } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [viajes, setViajes] = useState([]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      // Query trips by date from API and coordinates if provided
      const params = { fecha };
      if (lat_destino && lng_destino) {
        params.lat_destino = lat_destino;
        params.lng_destino = lng_destino;
      }
      const data = await getViajesDisponibles(params);
      
      // Filter by destination locally ONLY if we didn't use coordinates
      let filtered = data;
      if (!lat_destino || !lng_destino) {
        filtered = data.filter(trip => {
          const tripDest = (trip.nombre_destino || '').toLowerCase();
          const searchDest = (destino || '').toLowerCase();
          return tripDest.includes(searchDest);
        });
      }

      setViajes(filtered);
    } catch (error) {
      console.error('Error searching trips:', error);
      Alert.alert('Error de búsqueda', error.displayMessage || 'No se pudieron cargar los resultados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [destino, fecha, lat_destino, lng_destino]);

  const renderTripCard = ({ item }) => {
    const driverName = item.vehiculo?.conductor?.usuario?.nombre_completo || 'Conductor';
    const driverRating = item.vehiculo?.conductor?.usuario?.calificacion_conductor || '5.0';

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('TripDetail', { viajeId: item.id })}
        activeOpacity={0.9}
      >
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                <Text style={styles.avatarText}>{driverName.charAt(0)}</Text>
              </View>
              <View>
                <Text style={styles.driverNameText}>{driverName}</Text>
                <Text style={styles.ratingText}>⭐ {parseFloat(driverRating).toFixed(1)}</Text>
              </View>
            </View>
            <Text style={styles.price}>
              ${item.precio_sugerido ? parseFloat(item.precio_sugerido).toFixed(2) : '0.00'}
            </Text>
          </View>

          <View style={styles.routeContainer}>
            <View style={styles.routeItem}>
              <Ionicons name="radio-button-on" size={14} color={COLORS.textSecondary} />
              <Text style={styles.routeText} numberOfLines={1}>
                {item.nombre_origen || 'Origen'}
              </Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeItem}>
              <Ionicons name="location" size={14} color={COLORS.primary} />
              <Text style={styles.routeText} numberOfLines={1}>
                {item.nombre_destino || 'Destino'}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.dateTime}>
              {item.fecha} • {item.hora_inicio.substring(0, 5)}
            </Text>
            <Text style={[
              styles.availability,
              item.asientos_disponibles === 1 ? styles.alertText : styles.okText
            ]}>
              {item.asientos_disponibles} lugar{item.asientos_disponibles !== 1 ? 'es' : ''} libre{item.asientos_disponibles !== 1 ? 's' : ''}
            </Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopHeader title="Resultados de Búsqueda" showBack onBackPress={() => navigation.goBack()} />

      <View style={styles.searchSummary}>
        <Text style={styles.summaryTitle}>Buscando ruta hacia:</Text>
        <Text style={styles.summaryDetails}>
          {destino} • {fecha}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Buscando viajes disponibles...</Text>
        </View>
      ) : (
        <FlatList
          data={viajes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTripCard}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="No se encontraron viajes"
              description="No hay conductores ofreciendo viajes a este destino en la fecha seleccionada."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchSummary: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  summaryTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  summaryDetails: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  listContainer: {
    padding: SIZES.padding,
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  driverNameText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  routeContainer: {
    marginBottom: 14,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 8,
    flex: 1,
  },
  routeLine: {
    width: 1,
    height: 10,
    backgroundColor: COLORS.border,
    marginLeft: 6,
    marginVertical: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 10,
  },
  dateTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  availability: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  okText: {
    color: COLORS.success,
  },
  alertText: {
    color: COLORS.warning,
  },
});