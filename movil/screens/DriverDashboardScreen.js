import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
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
  const [stats, setStats] = useState({
    viajesTotales: 0,
    viajesSemana: 0,
    pasajerosAceptados: 0,
    solicitudesAceptadas: 0,
    gananciasTotales: 0,
    gananciasSemana: 0,
    gananciasMes: 0,
    desvioKmTotal: 0,
    calificacionPromedio: 5.0,
  });

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

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, [])
  );

  useEffect(() => {
    const hoy = new Date();
    const hace7Dias = new Date();
    hace7Dias.setDate(hoy.getDate() - 7);
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    let vTotales = 0;
    let vSemana = 0;
    let pAceptados = 0;
    let solAceptadas = 0;
    let gTotales = 0;
    let gSemana = 0;
    let gMes = 0;
    let desvioMetersTotal = 0;

    viajes.forEach(v => {
      // Check date 
      let vDate = new Date(v.fecha);
      if (isNaN(vDate)) {
        // Fallback for weird dates
        const parts = v.fecha.split('-');
        if (parts.length === 3) {
          vDate = new Date(parts[0], parts[1] - 1, parts[2]);
        } else {
          vDate = new Date();
        }
      }

      const isSemana = vDate >= hace7Dias && vDate <= hoy;
      const isMes = vDate >= primerDiaMes && vDate <= hoy;

      // Viajes realizados (estatus 3 = Finalizado)
      if (v.id_estatus === 3) {
        vTotales++;
        if (isSemana) vSemana++;

        const aceptadas = v.solicitudes?.filter(s => s.id_estatus === 3) || [];
        pAceptados += aceptadas.length;
        solAceptadas += aceptadas.length;
        
        aceptadas.forEach(s => {
          const precio = parseFloat(s.precio || 0);
          gTotales += precio;
          if (isSemana) gSemana += precio;
          if (isMes) gMes += precio;
          desvioMetersTotal += parseFloat(s.desvio_metros || 0);
        });
      }
    });

    const desvioKmTotal = (desvioMetersTotal / 1000);
    const calificacion = user.calificacion_conductor ? parseFloat(user.calificacion_conductor) : 5.0;

    setStats({
      viajesTotales: vTotales,
      viajesSemana: vSemana,
      pasajerosAceptados: pAceptados,
      solicitudesAceptadas: solAceptadas,
      gananciasTotales: gTotales,
      gananciasSemana: gSemana,
      gananciasMes: gMes,
      desvioKmTotal: desvioKmTotal,
      calificacionPromedio: calificacion
    });
  }, [viajes]);

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

      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Rendimiento Financiero</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Ionicons name="cash" size={24} color={COLORS.success} />
            <Text style={styles.statValue}>${stats.gananciasSemana.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Semana</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="wallet" size={24} color={COLORS.success} />
            <Text style={styles.statValue}>${stats.gananciasMes.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Mes</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="podium" size={24} color={COLORS.success} />
            <Text style={styles.statValue}>${stats.gananciasTotales.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Totales</Text>
          </View>
        </View>

        <Text style={[styles.statsTitle, { marginTop: 16 }]}>Métricas Operativas</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Ionicons name="car-sport" size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{stats.viajesSemana} / {stats.viajesTotales}</Text>
            <Text style={styles.statLabel}>Viajes (Sem/Tot)</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="people" size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{stats.pasajerosAceptados}</Text>
            <Text style={styles.statLabel}>Pasajeros Tot.</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="trending-up" size={24} color={COLORS.warning} />
            <Text style={styles.statValue}>{stats.desvioKmTotal.toFixed(1)} km</Text>
            <Text style={styles.statLabel}>Desvío Total</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="star" size={24} color="#D97706" />
            <Text style={styles.statValue}>{stats.calificacionPromedio.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Calificación</Text>
          </View>
        </View>
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
  statsContainer: {
    paddingHorizontal: SIZES.padding,
    marginBottom: 10,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
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
