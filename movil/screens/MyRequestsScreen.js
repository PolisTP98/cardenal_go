import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { getSolicitudesPasajero } from '../src/api/solicitudesApi';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';

export default function MyRequestsScreen({ navigation }) {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = async () => {
    try {
      const data = await getSolicitudesPasajero(user.id);
      setSolicitudes(data);
    } catch (error) {
      console.error('Error fetching passenger requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const renderRequestCard = ({ item }) => {
    const trip = item.viaje || {};
    const driverName = trip.vehiculo?.conductor?.usuario?.nombre_completo || 'Conductor';
    const origen = trip.nombre_origen || 'Origen';
    const destino = trip.nombre_destino || 'Destino';
    const fecha = trip.fecha || '';
    const hora = trip.hora_inicio ? trip.hora_inicio.substring(0, 5) : '';

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('TripDetail', { viajeId: item.id_viaje })}
        activeOpacity={0.9}
      >
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.dateTime}>{fecha} • {hora}</Text>
              <Text style={styles.driverLabel}>Conductor: <Text style={styles.boldText}>{driverName}</Text></Text>
            </View>
            <StatusBadge statusId={item.id_estatus} type="solicitud" />
          </View>

          <View style={styles.divider} />

          <View style={styles.routeContainer}>
            <View style={styles.routeItem}>
              <Ionicons name="radio-button-on" size={14} color={COLORS.textSecondary} />
              <Text style={styles.routeText} numberOfLines={1}>{origen}</Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeItem}>
              <Ionicons name="location" size={14} color={COLORS.primary} />
              <Text style={styles.routeText} numberOfLines={1}>{destino}</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopHeader title="Mis Solicitudes" showBack onBackPress={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando solicitudes...</Text>
        </View>
      ) : (
        <FlatList
          data={solicitudes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRequestCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="Aún no tienes solicitudes"
              description="Busca un viaje y solicita un lugar para que aparezca aquí."
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
    alignItems: 'flex-start',
  },
  dateTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  driverLabel: {
    fontSize: 13,
    color: COLORS.text,
    marginTop: 4,
  },
  boldText: {
    fontWeight: 'bold',
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
