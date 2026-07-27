import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { getViaje, actualizarViaje } from '../src/api/viajesApi';
import { getSolicitudesViaje, crearSolicitud, actualizarSolicitud, getSolicitudesPasajero } from '../src/api/solicitudesApi';
import { getChatViaje } from '../src/api/socialApi';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import PrimaryButton from '../components/PrimaryButton';
import LoadingOverlay from '../components/LoadingOverlay';
import CustomInput from '../components/CustomInput';
import MapaRutas, { getDistanceKm } from '../components/MapaRutas';

export default function TripDetailScreen({ route, navigation }) {
  const { viajeId } = route.params;
  const { user, isDriver } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [viaje, setViaje] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]); // Conductor view
  const [pasajeroSolicitud, setPasajeroSolicitud] = useState(null); // Passenger view

  // Passenger requested dropoff location state
  const [pasajeroDestino, setPasajeroDestino] = useState('');
  const [passengerDropoffCoords, setPassengerDropoffCoords] = useState(null);

  const loadData = async () => {
    try {
      // 1. Fetch trip details
      const tripData = await getViaje(viajeId);
      setViaje(tripData);

      // Check if current user is the driver of the trip
      const conductor = tripData.vehiculo?.conductor;
      const tripDriverId = conductor?.id_usuario || conductor?.usuario?.id;
      const isOwner = tripDriverId != null && String(tripDriverId) === String(user.id);

      if (isOwner) {
        // Conductor mode: load requests list
        const reqs = await getSolicitudesViaje(viajeId);
        setSolicitudes(reqs);
      } else {
        // Pasajero mode: check if this passenger has already sent a request
        const myReqs = await getSolicitudesPasajero(user.id);
        const activeReq = myReqs.find(s => s.id_viaje === viajeId && s.id_estatus !== 5); // 5 is Cancelled
        setPasajeroSolicitud(activeReq || null);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'No se pudieron cargar los detalles del viaje.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [viajeId]);

  const handleCreateRequest = async () => {
    if (viaje?.asientos_disponibles < 1) {
      Alert.alert('Sin lugares', 'Este viaje ya no cuenta con asientos disponibles.');
      return;
    }

    if (!pasajeroDestino.trim()) {
      Alert.alert('Destino requerido', 'Por favor ingresa o selecciona en el mapa el destino al que deseas llegar.');
      return;
    }

    const dropoffCoords = passengerDropoffCoords || {
      latitude: viaje.ubicacion_destino?.coordinates?.[1] || 20.5888,
      longitude: viaje.ubicacion_destino?.coordinates?.[0] || -100.3899,
    };

    // Calculate detour distance from trip destination
    const tripDestLat = viaje.ubicacion_destino?.coordinates?.[1] || 20.5888;
    const tripDestLon = viaje.ubicacion_destino?.coordinates?.[0] || -100.3899;
    const detourKm = getDistanceKm(tripDestLat, tripDestLon, dropoffCoords.latitude, dropoffCoords.longitude);
    const detourMeters = Math.round(detourKm * 1000);

    setActionLoading(true);
    try {
      const solData = {
        id_viaje: viajeId,
        id_pasajero: user.id,
        id_metodo_pago: 1, // Efectivo (default)
        id_estatus: 1, // Pendiente
        ubicacion_recogida: viaje.ubicacion_inicio, // copy start coordinates
        ubicacion_bajada: {
          type: 'Point',
          coordinates: [dropoffCoords.longitude, dropoffCoords.latitude],
        },
        desvio_metros: detourMeters,
        precio: viaje.precio_sugerido || 0.0,
        notas_adicionales: `Destino: ${pasajeroDestino.trim()}`,
      };
      await crearSolicitud(solData);
      Alert.alert('Solicitud enviada', 'Tu solicitud con tu destino fue enviada al conductor para su revisión.');
      loadData();
    } catch (error) {
      Alert.alert('Error al solicitar', error.displayMessage || 'No se pudo registrar la solicitud.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!pasajeroSolicitud) return;

    Alert.alert(
      'Cancelar Solicitud',
      '¿Estás seguro de que deseas cancelar tu lugar en este viaje?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await actualizarSolicitud(pasajeroSolicitud.id, 5); // 5 = Cancelada
              Alert.alert('Cancelada', 'Has cancelado tu solicitud.');
              loadData();
            } catch (err) {
              Alert.alert('Error', err.displayMessage || 'No se pudo cancelar la solicitud.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAcceptRequest = async (solId) => {
    setActionLoading(true);
    try {
      await actualizarSolicitud(solId, 3); // 3 = Aceptada
      Alert.alert('Solicitud Aceptada', 'El pasajero ha sido añadido a tu viaje.');
      loadData();
    } catch (err) {
      Alert.alert('Error', err.displayMessage || 'No se pudo procesar la solicitud.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async (solId) => {
    setActionLoading(true);
    try {
      await actualizarSolicitud(solId, 4); // 4 = Rechazada
      Alert.alert('Solicitud Rechazada', 'Has denegado la solicitud de reserva.');
      loadData();
    } catch (err) {
      Alert.alert('Error', err.displayMessage || 'No se pudo procesar la solicitud.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenChat = async (otroUsuario) => {
    if (!otroUsuario) return;
    setActionLoading(true);
    try {
      const chat = await getChatViaje(viajeId);
      navigation.navigate('Chat', {
        chatId: chat.id,
        otroUsuarioId: otroUsuario.id,
        otroUsuarioNombre: otroUsuario.nombre_completo,
        viajeInfo: { viajeId }
      });
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'No se pudo abrir el chat de este viaje.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTripStatus = async (statusId, statusLabel) => {
    Alert.alert(
      'Actualizar Viaje',
      `¿Deseas cambiar el estado del viaje a "${statusLabel}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setActionLoading(true);
            try {
              await actualizarViaje(viajeId, { id_estatus: statusId });
              Alert.alert('Estatus Actualizado', `El viaje ahora está en estado: ${statusLabel}.`);
              loadData();
            } catch (err) {
              Alert.alert('Error', err.displayMessage || 'No se pudo actualizar el estado.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando detalles del viaje...</Text>
      </View>
    );
  }

  const conductorObj = viaje.vehiculo?.conductor;
  const tDriverId = conductorObj?.id_usuario || conductorObj?.usuario?.id;
  const isOwner = tDriverId != null && String(tDriverId) === String(user.id);

  return (
    <SafeAreaView style={styles.container}>
      <TopHeader title="Detalle del Viaje" showBack onBackPress={() => navigation.navigate(isDriver ? 'DriverDashboard' : 'PassengerDashboard')} />
      <LoadingOverlay visible={actionLoading} message="Procesando acción..." />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.detailCard}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.dateTime}>
                {viaje.fecha} a las {viaje.hora_inicio.substring(0, 5)}
              </Text>
              <Text style={styles.price}>
                Tarifa: ${viaje.precio_sugerido ? parseFloat(viaje.precio_sugerido).toFixed(2) : '0.00'}
              </Text>
            </View>
            <StatusBadge statusId={viaje.id_estatus} type="viaje" />
          </View>

          <View style={styles.divider} />

          <View style={styles.routeContainer}>
            <View style={styles.routeItem}>
              <Ionicons name="radio-button-on" size={20} color={COLORS.textSecondary} style={styles.icon} />
              <View>
                <Text style={styles.routeLabel}>Origen</Text>
                <Text style={styles.routeName}>{viaje.nombre_origen || 'Origen'}</Text>
              </View>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeItem}>
              <Ionicons name="location" size={20} color={COLORS.primary} style={styles.icon} />
              <View>
                <Text style={styles.routeLabel}>Destino</Text>
                <Text style={styles.routeName}>{viaje.nombre_destino || 'Destino'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="people" size={20} color={COLORS.textSecondary} />
              <Text style={styles.infoVal}>{viaje.asientos_disponibles} libres / {viaje.asientos_totales} totales</Text>
            </View>
            {viaje.vehiculo && (
              <View style={styles.infoItem}>
                <Ionicons name="car" size={20} color={COLORS.textSecondary} />
                <Text style={styles.infoVal}>{viaje.vehiculo.modelo} ({viaje.vehiculo.color})</Text>
              </View>
            )}
          </View>

          {/* MAPA DE LA RUTA */}
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Ruta en el Mapa</Text>
          <MapaRutas
            interactive={!isOwner && !pasajeroSolicitud}
            height={220}
            waypoints={[
              {
                latitude: viaje.ubicacion_inicio?.coordinates?.[1] || 20.5891,
                longitude: viaje.ubicacion_inicio?.coordinates?.[0] || -100.4376,
                title: `Origen: ${viaje.nombre_origen || 'Origen'}`,
                color: 'green',
              },
              ...(passengerDropoffCoords ? [{
                latitude: passengerDropoffCoords.latitude,
                longitude: passengerDropoffCoords.longitude,
                title: `Tu bajada: ${pasajeroDestino || 'Mi Destino'}`,
                color: 'orange',
              }] : []),
              {
                latitude: viaje.ubicacion_destino?.coordinates?.[1] || 20.5888,
                longitude: viaje.ubicacion_destino?.coordinates?.[0] || -100.3899,
                title: `Destino Final: ${viaje.nombre_destino || 'Destino'}`,
                color: 'red',
              },
            ]}
            onMapPress={(coord) => {
              if (!isOwner && !pasajeroSolicitud) {
                setPassengerDropoffCoords(coord);
              }
            }}
          />
        </Card>

        {/* DRIVER INFO SECTION */}
        {!isOwner && viaje.vehiculo?.conductor?.usuario && (
          <Card>
            <Text style={styles.sectionTitle}>Conductor</Text>
            <TouchableOpacity
              style={styles.driverRow}
              onPress={() => navigation.navigate('Profile', { usuarioId: viaje.vehiculo.conductor.usuario.id })}
              activeOpacity={0.7}
            >
              <View style={styles.driverAvatar}>
                <Text style={styles.avatarText}>
                  {viaje.vehiculo.conductor.usuario.nombre_completo.charAt(0)}
                </Text>
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{viaje.vehiculo.conductor.usuario.nombre_completo}</Text>
                <Text style={styles.driverCal}>
                  ⭐ {parseFloat(viaje.vehiculo.conductor.usuario.calificacion_conductor).toFixed(1)} / 5.0 como conductor
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </Card>
        )}

        {/* OWNER (CONDUCTOR) TRIP CONTROL SECTION */}
        {isOwner && (
          <Card>
            <Text style={styles.sectionTitle}>Controles del Viaje</Text>
            <View style={styles.btnRow}>
              {viaje.id_estatus === 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: COLORS.warning }]}
                    onPress={() => handleUpdateTripStatus(2, 'En curso')}
                  >
                    <Ionicons name="play" size={16} color="#1E293B" />
                    <Text style={[styles.actionBtnText, { color: '#1E293B' }]}>Iniciar viaje</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: COLORS.danger }]}
                    onPress={() => handleUpdateTripStatus(4, 'Cancelado')}
                  >
                    <Ionicons name="close" size={16} color="#FFF" />
                    <Text style={styles.actionBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                </>
              )}
              {viaje.id_estatus === 2 && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: COLORS.success, flex: 1 }]}
                  onPress={() => handleUpdateTripStatus(3, 'Finalizado')}
                >
                  <Ionicons name="checkmark-done" size={16} color="#FFF" />
                  <Text style={styles.actionBtnText}>Finalizar viaje</Text>
                </TouchableOpacity>
              )}
              {viaje.id_estatus > 2 && (
                <Text style={styles.completedText}>
                  Este viaje se encuentra {viaje.id_estatus === 3 ? 'Finalizado' : 'Cancelado'}.
                </Text>
              )}
            </View>
          </Card>
        )}

        {/* REQUESTS LIST SECTION (FOR CONDUCTORS ONLY) */}
        {isOwner && (
          <View style={styles.requestsSection}>
            <Text style={styles.sectionTitle}>Solicitudes de Reservación ({solicitudes.length})</Text>
            {solicitudes.length === 0 ? (
              <Text style={styles.noRequests}>Ninguna solicitud recibida para este viaje.</Text>
            ) : (
              solicitudes.map((item) => {
                const reqDestName = item.notas_adicionales?.replace('Destino:', '').trim() || 'Destino no especificado';
                const dropLat = item.ubicacion_bajada?.coordinates?.[1];
                const dropLon = item.ubicacion_bajada?.coordinates?.[0];
                const tripDestLat = viaje.ubicacion_destino?.coordinates?.[1] || 20.5888;
                const tripDestLon = viaje.ubicacion_destino?.coordinates?.[0] || -100.3899;
                
                const detourKm = dropLat && dropLon ? getDistanceKm(tripDestLat, tripDestLon, dropLat, dropLon) : (parseFloat(item.desvio_metros || 0) / 1000);
                const detourMin = Math.round(detourKm * 2.5); // Estimate ~2.5 mins per km

                return (
                  <Card key={item.id} style={styles.requestCard}>
                    <View style={styles.reqHeader}>
                      <TouchableOpacity
                        style={styles.reqUserRow}
                        onPress={() => navigation.navigate('Profile', { usuarioId: item.pasajero?.id })}
                        activeOpacity={0.7}
                      >
                        <View style={styles.userAvatarSmall}>
                          <Text style={styles.avatarTextSmall}>
                            {item.pasajero?.nombre_completo?.charAt(0) || 'P'}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.reqPassengerName}>{item.pasajero?.nombre_completo || 'Pasajero'}</Text>
                          <Text style={styles.reqPassengerCal}>
                            ⭐ {item.pasajero?.calificacion_pasajero ? parseFloat(item.pasajero.calificacion_pasajero).toFixed(1) : '5.0'}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color={COLORS.textSecondary} style={{ marginLeft: 6 }} />
                      </TouchableOpacity>
                      <StatusBadge statusId={item.id_estatus} type="solicitud" />
                    </View>

                    <View style={styles.destDetourBox}>
                      <Ionicons name="location" size={16} color={COLORS.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.destText}>Destino solicitado: <Text style={{ fontWeight: 'bold' }}>{reqDestName}</Text></Text>
                        <Text style={styles.detourText}>
                          📍 Desvío estimado: {detourKm > 0.1 ? `+${detourKm.toFixed(1)} km (~${detourMin} min extra)` : 'En la ruta directa (0 km desvío)'}
                        </Text>
                      </View>
                    </View>

                    {item.id_estatus === 1 && viaje.id_estatus === 1 && (
                      <View style={styles.reqActionRow}>
                        <TouchableOpacity
                          style={[styles.reqBtn, styles.acceptBtn]}
                          onPress={() => handleAcceptRequest(item.id)}
                        >
                          <Text style={styles.reqBtnText}>Aceptar Pasajero</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.reqBtn, styles.rejectBtn]}
                          onPress={() => handleRejectRequest(item.id)}
                        >
                          <Text style={styles.reqBtnText}>Rechazar</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {item.id_estatus === 3 && (
                      <View style={styles.reqActionRow}>
                        <TouchableOpacity
                          style={[styles.reqBtn, styles.chatBtn]}
                          onPress={() => handleOpenChat(item.pasajero)}
                        >
                          <Ionicons name="chatbubbles-outline" size={14} color="#FFF" style={{ marginRight: 6 }} />
                          <Text style={styles.reqBtnText}>Chatear</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </Card>
                );
              })
            )}
          </View>
        )}

        {/* PASSENGER ACTION SECTION */}
        {!isOwner && (
          <View style={styles.passengerActionContainer}>
            {pasajeroSolicitud ? (
              <Card style={styles.statusCard}>
                <View style={styles.statusCardRow}>
                  <Text style={styles.statusCardTitle}>Estatus de tu solicitud:</Text>
                  <StatusBadge statusId={pasajeroSolicitud.id_estatus} type="solicitud" />
                </View>
                {pasajeroSolicitud.id_estatus === 1 && (
                  <PrimaryButton
                    title="Cancelar Solicitud"
                    onPress={handleCancelRequest}
                    style={styles.cancelBtn}
                  />
                )}
                {pasajeroSolicitud.id_estatus === 3 && (
                  <View style={{ width: '100%' }}>
                    <View style={styles.boardingBadge}>
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                      <Text style={styles.boardingText}>Tu lugar está reservado. ¡Llega a tiempo!</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.chatBtnLarge}
                      onPress={() => handleOpenChat(viaje.vehiculo?.conductor?.usuario)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="chatbubbles-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={styles.chatBtnLargeText}>Chatear con Conductor</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            ) : (
              viaje.id_estatus === 1 && (
                <Card style={{ padding: 16 }}>
                  <Text style={styles.sectionTitle}>Solicitar Asiento</Text>
                  <CustomInput
                    label="¿A qué destino deseas llegar?"
                    placeholder="Ej. Plaza del Parque, Av. Constituyentes, etc."
                    value={pasajeroDestino}
                    onChangeText={setPasajeroDestino}
                  />
                  <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 }}>
                    💡 Tip: También puedes tocar en el mapa arriba para marcar el punto exacto de tu bajada.
                  </Text>
                  <PrimaryButton
                    title={viaje.asientos_disponibles > 0 ? "Enviar Solicitud al Conductor" : "Sin lugares disponibles"}
                    onPress={handleCreateRequest}
                    style={[styles.requestBtn, viaje.asientos_disponibles <= 0 && styles.disabledBtn]}
                    disabled={viaje.asientos_disponibles <= 0}
                  />
                </Card>
              )
            )}
          </View>
        )}
      </ScrollView>
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
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  scrollContent: {
    padding: SIZES.padding,
  },
  detailCard: {
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateTime: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },
  routeContainer: {
    marginVertical: 4,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  routeLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  routeName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: COLORS.border,
    marginLeft: 9,
    marginVertical: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoVal: {
    marginLeft: 6,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  driverCal: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  completedText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    flex: 1,
  },
  requestsSection: {
    marginTop: 8,
  },
  noRequests: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  requestCard: {
    padding: 14,
    marginBottom: 12,
  },
  reqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reqUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarTextSmall: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reqPassengerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  reqPassengerCal: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  reqActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 10,
  },
  reqBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  acceptBtn: {
    backgroundColor: COLORS.success,
  },
  rejectBtn: {
    backgroundColor: COLORS.danger,
  },
  reqBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  passengerActionContainer: {
    marginTop: 4,
  },
  statusCard: {
    padding: 16,
    alignItems: 'center',
  },
  statusCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  statusCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  cancelBtn: {
    backgroundColor: COLORS.danger,
    marginTop: 8,
  },
  boardingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    padding: 10,
    borderRadius: 8,
    width: '100%',
    justifyContent: 'center',
    gap: 6,
  },
  boardingText: {
    color: '#065F46',
    fontWeight: 'bold',
    fontSize: 12,
  },
  requestBtn: {
    marginVertical: 4,
  },
  disabledBtn: {
    backgroundColor: '#CCCCCC',
  },
  destDetourBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  destText: {
    fontSize: 13,
    color: COLORS.text,
  },
  detourText: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '600',
    marginTop: 2,
  },
  chatBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBtnLarge: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    marginTop: 12,
    gap: 4,
  },
  chatBtnLargeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
