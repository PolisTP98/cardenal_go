import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { getViajesDisponibles } from '../src/api/viajesApi';
import { COLORS, SIZES } from '../components/Theme';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import TopHeader from '../components/TopHeader';
import EmptyState from '../components/EmptyState';

export default function PassengerDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [viajes, setViajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAvailableTrips = async () => {
    try {
      const data = await getViajesDisponibles();
      setViajes(data);
    } catch (error) {
      console.error('Error fetching available trips:', error);
      Alert.alert('Error de conexión', error.displayMessage || 'No se pudieron cargar los viajes disponibles.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAvailableTrips();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAvailableTrips();
  };

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
      <TopHeader
        title="Cardenal GO"
        rightIcon={() => (
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileBtn}>
            <Ionicons name="person-circle-outline" size={26} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      />

      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeText}>¡Hola, {user.nombre_completo.split(' ')[0]}!</Text>
        <Text style={styles.subWelcome}>¿A dónde viajas hoy?</Text>
      </View>

      <View style={styles.quickNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('SearchTrip')}
        >
          <View style={[styles.iconBg, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="search" size={24} color="#1D4ED8" />
          </View>
          <Text style={styles.navLabel}>Buscar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('MyRequests')}
        >
          <View style={[styles.iconBg, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="receipt-outline" size={24} color="#D97706" />
          </View>
          <Text style={styles.navLabel}>Mis Solicitudes</Text>
        </TouchableOpacity>

        {user?.originalRole !== 'Conductor' && (
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('DriverRegistration')}
          >
            <View style={[styles.iconBg, { backgroundColor: '#D1FAE5' }]} >
              <Ionicons name="car-outline" size={24} color="#059669" />
            </View>
            <Text style={styles.navLabel}>Ser Conductor</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Viajes Disponibles</Text>
        <TouchableOpacity onPress={fetchAvailableTrips}>
          <Ionicons name="refresh" size={18} color={COLORS.primary} />
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
              icon="car-sport-outline"
              title="No hay viajes programados"
              description="Vuelve más tarde o utiliza la búsqueda para encontrar rutas disponibles."
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
  profileBtn: {
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
  quickNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  navItem: {
    alignItems: 'center',
  },
  iconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
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
