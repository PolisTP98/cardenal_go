import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { getMisViajes } from '../src/api/viajesApi';
import { COLORS, SIZES } from '../components/Theme';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import TopHeader from '../components/TopHeader';
import EmptyState from '../components/EmptyState';

export default function DriverDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [viajes, setViajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrips = async () => {
    try {
      const data = await getMisViajes(user.id);
      setViajes(data);
    } catch (error) {
      console.error('Error fetching driver trips:', error);
      Alert.alert('Error de conexión', error.displayMessage || 'No se pudieron cargar tus viajes publicados.');
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
    const pendingRequests = item.solicitudes?.filter(s => s.id_estatus === 1) || [];

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('TripDetail', { viajeId: item.id })}
        activeOpacity={0.9}
      >
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.dateTime}>
              {item.fecha} • {item.hora_inicio.substring(0, 5)}
            </Text>
            <StatusBadge statusId={item.id_estatus} type="viaje" />
          </View>

          <View style={styles.routeContainer}>
            <View style={styles.routeItem}>
              <Ionicons name="radio-button-on" size={16} color={COLORS.textSecondary} />
              <Text style={styles.routeText} numberOfLines={1}>
                {item.nombre_origen || 'Origen'}
              </Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeItem}>
              <Ionicons name="location" size={16} color={COLORS.primary} />
              <Text style={styles.routeText} numberOfLines={1}>
                {item.nombre_destino || 'Destino'}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.seatsInfo}>
              Lugares: <Text style={styles.boldText}>{item.asientos_disponibles}/{item.asientos_totales}</Text>
            </Text>
            {pendingRequests.length > 0 ? (
              <View style={styles.requestAlert}>
                <Text style={styles.requestAlertText}>
                  {pendingRequests.length} Solicitud{pendingRequests.length > 1 ? 'es' : ''} pendiente{pendingRequests.length > 1 ? 's' : ''}
                </Text>
              </View>
            ) : (
              <Text style={styles.priceText}>
                ${item.precio_sugerido ? parseFloat(item.precio_sugerido).toFixed(2) : '0.00'}
              </Text>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopHeader
        title="Panel Conductor"
        rightIcon={() => (
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.logoutBtn}>
            <Ionicons name="person-circle-outline" size={26} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      />

      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeText}>¡Hola, {user.nombre_completo.split(' ')[0]}!</Text>
        <Text style={styles.subWelcome}>Gestiona tus rutas compartidas</Text>
      </View>

      <View style={styles.actionsBar}>
        <Text style={styles.sectionTitle}>Mis Viajes Publicados</Text>
        <TouchableOpacity
          style={styles.publishBtn}
          onPress={() => navigation.navigate('PublishTrip')}
        >
          <Ionicons name="add-circle" size={20} color="#FFF" />
          <Text style={styles.publishBtnText}>Publicar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={viajes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTripCard}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="car-outline"
              title="Aún no has publicado viajes"
              description="Comparte tu vehículo para ayudar a otros estudiantes a llegar a la UPQ."
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  logoutBtn: {
    padding: 4,
  },
  welcomeContainer: {
    paddingHorizontal: SIZES.padding,
    marginVertical: 12,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subWelcome: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
  },
  publishBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  listContainer: {
    padding: SIZES.padding,
    paddingTop: 4,
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateTime: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  routeContainer: {
    marginBottom: 14,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeText: {
    fontSize: 15,
    color: COLORS.text,
    marginLeft: 10,
    flex: 1,
  },
  routeLine: {
    width: 1,
    height: 12,
    backgroundColor: COLORS.border,
    marginLeft: 7,
    marginVertical: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 12,
  },
  seatsInfo: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  boldText: {
    fontWeight: 'bold',
    color: COLORS.text,
  },
  requestAlert: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  requestAlertText: {
    color: '#D97706',
    fontWeight: 'bold',
    fontSize: 11,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});
