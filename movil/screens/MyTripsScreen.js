import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { getMisViajes } from '../src/api/viajesApi';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';

export default function MyTripsScreen({ navigation }) {
  const { user } = useAuth();
  const [viajes, setViajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrips = async () => {
    try {
      const data = await getMisViajes(user.id);
      // Filter out only finished (3) or cancelled (4) trips for history
      const history = data.filter(trip => trip.id_estatus > 2);
      setViajes(history);
    } catch (error) {
      console.error('Error fetching driver history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrips();
  };

  const renderTripCard = ({ item }) => {
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('TripDetail', { viajeId: item.id })}
        activeOpacity={0.9}
      >
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.dateTime}>{item.fecha} • {item.hora_inicio.substring(0, 5)}</Text>
            <StatusBadge statusId={item.id_estatus} type="viaje" />
          </View>

          <View style={styles.divider} />

          <View style={styles.routeContainer}>
            <View style={styles.routeItem}>
              <Ionicons name="radio-button-on" size={14} color={COLORS.textSecondary} />
              <Text style={styles.routeText} numberOfLines={1}>{item.nombre_origen || 'Origen'}</Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeItem}>
              <Ionicons name="location" size={14} color={COLORS.primary} />
              <Text style={styles.routeText} numberOfLines={1}>{item.nombre_destino || 'Destino'}</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopHeader title="Historial de Viajes (Conductor)" showBack onBackPress={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando historial...</Text>
        </View>
      ) : (
        <FlatList
          data={viajes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTripCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="Sin viajes pasados"
              description="Los viajes que completes o canceles se mostrarán en esta pantalla."
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
  },
  dateTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },
  routeContainer: {},
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
    marginVertical: 2,
  },
});
