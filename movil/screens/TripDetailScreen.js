import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { getViaje, actualizarViaje } from '../src/api/viajesApi';
import { getSolicitudesViaje, crearSolicitud, actualizarSolicitud, getSolicitudesPasajero, getRecomendacionIA } from '../src/api/solicitudesApi';
import { getChatViaje } from '../src/api/socialApi';
import { API_BASE_URL } from '../src/api/apiClient';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import PrimaryButton from '../components/PrimaryButton';
import LoadingOverlay from '../components/LoadingOverlay';
import MapaRutas, { getDistanceKm } from '../components/MapaRutas';
import LocationSearchInput from '../components/LocationSearchInput';
import VehicleColorBadge from '../components/VehicleColorBadge';

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
  const [destinoValidado, setDestinoValidado] = useState(false);

  // Passenger requested pickup location state
  const [pasajeroOrigen, setPasajeroOrigen] = useState('');
  const [passengerPickupCoords, setPassengerPickupCoords] = useState(null);
  const [origenValidado, setOrigenValidado] = useState(false);
  const [passengerSelectingTarget, setPassengerSelectingTarget] = useState('destino');

  // AI Evaluation state
  const [aiEvaluations, setAiEvaluations] = useState({});
  // Expanded map previews for driver requests
  const [expandedMaps, setExpandedMaps] = useState({});

  const loadData = async () => {
    try {
      // 1. Fetch trip details
      const tripData = await getViaje(viajeId);
      setViaje(tripData);

      // Check if current user is the driver of the trip
      const conductor = tripData.vehiculo?.conductor;
      const tripDriverId = conductor?.id_usuario || conductor?.usuario?.id;
      const isOwner = tripDriverId != null && String(tripDriverId) === String(user.id);

      // Fetch all requests for both driver and passenger to map the route
      const reqs = await getSolicitudesViaje(viajeId);
      setSolicitudes(reqs);

      if (!isOwner) {
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

  // Auto-evaluate pending requests with AI
  useEffect(() => {
    const evaluatePending = async () => {
      const pending = solicitudes.filter(s => s.id_estatus === 1 && !aiEvaluations[s.id]);
      if (pending.length === 0) return;

      for (const req of pending) {
        try {
          const result = await getRecomendacionIA(req.id);
          setAiEvaluations(prev => ({ ...prev, [req.id]: result }));
        } catch (err) {
          console.error('Error evaluating IA for req', req.id, err);
        }
      }
    };
    evaluatePending();
  }, [solicitudes, aiEvaluations]);

  // ─── Waypoints Centralizados (Paradas Aceptadas) ─────────────────────────────
  const sharedAcceptedStops = useMemo(() => {
    const stops = [];
    if (solicitudes && solicitudes.length > 0) {
      solicitudes.filter(s => s.id_estatus === 3).forEach((s, idx) => {
        const pName = s.pasajero?.nombre_completo?.split(' ')[0] || `Pasajero ${idx + 1}`;
        if (s.ubicacion_recogida?.coordinates) {
          stops.push({
            latitude: s.ubicacion_recogida.coordinates[1],
            longitude: s.ubicacion_recogida.coordinates[0],
            title: `Subida: ${pName}`,
            color: 'blue',
          });
        }
        if (s.ubicacion_bajada?.coordinates) {
          stops.push({
            latitude: s.ubicacion_bajada.coordinates[1],
            longitude: s.ubicacion_bajada.coordinates[0],
            title: `Bajada: ${pName}`,
            color: 'orange',
          });
        }
      });
    }
    return stops;
  }, [solicitudes]);

  // ─── Waypoints dinámicos para el mapa principal ──────────────────────────────
  const mainMapWaypoints = useMemo(() => {
    if (!viaje) return [];

    const conductorObj = viaje.vehiculo?.conductor;
    const tDriverId = conductorObj?.id_usuario || conductorObj?.usuario?.id;
    const isOwner = tDriverId != null && String(tDriverId) === String(user.id);

    const origen = {
      latitude: viaje.ubicacion_inicio?.coordinates?.[1] || 20.5891,
      longitude: viaje.ubicacion_inicio?.coordinates?.[0] || -100.4376,
      title: `Origen: ${viaje.nombre_origen || 'Origen'}`,
      color: 'green',
    };
    const destino = {
      latitude: viaje.ubicacion_destino?.coordinates?.[1] || 20.5888,
      longitude: viaje.ubicacion_destino?.coordinates?.[0] || -100.3899,
      title: `Destino Final: ${viaje.nombre_destino || 'Destino'}`,
      color: 'red',
    };

    // Si el pasajero actual tiene solicitud aceptada y no está en la lista general por alguna razón
    const miParada =
      !isOwner && pasajeroSolicitud?.id_estatus === 3 && pasajeroSolicitud?.ubicacion_bajada?.coordinates && sharedAcceptedStops.length === 0
        ? [{
            latitude: pasajeroSolicitud.ubicacion_bajada.coordinates[1],
            longitude: pasajeroSolicitud.ubicacion_bajada.coordinates[0],
            title: 'Tu bajada',
            color: 'orange',
          }]
        : [];

    return [origen, ...sharedAcceptedStops, ...miParada, destino];
  }, [viaje, sharedAcceptedStops, pasajeroSolicitud]);

  // Waypoints para el mapa de solicitud del pasajero (dentro de la card Solicitar Asiento)
  const requestMapWaypoints = useMemo(() => {
    if (!viaje) return [];
    
    const pts = [];
    
    // 1. Siempre mantener el Origen original del conductor
    pts.push({
      latitude: viaje.ubicacion_inicio?.coordinates?.[1] || 20.5891,
      longitude: viaje.ubicacion_inicio?.coordinates?.[0] || -100.4376,
      title: `Origen: ${viaje.nombre_origen || 'Origen'}`,
      color: 'green',
    });

    // 1.5. Insertar paradas intermedias de otras solicitudes ya aceptadas
    pts.push(...sharedAcceptedStops);

    // 2. Insertar punto de recogida del pasajero como parada (si aplica)
    if (passengerPickupCoords) {
      pts.push({
        latitude: passengerPickupCoords.latitude,
        longitude: passengerPickupCoords.longitude,
        title: `Tu subida: ${pasajeroOrigen || 'Mi Origen'}`,
        color: 'blue',
      });
    }
    
    // 3. Insertar punto de bajada del pasajero como parada (si aplica)
    if (passengerDropoffCoords) {
      pts.push({
        latitude: passengerDropoffCoords.latitude,
        longitude: passengerDropoffCoords.longitude,
        title: `Tu bajada: ${pasajeroDestino || 'Mi Destino'}`,
        color: 'orange',
      });
    }
    
    // 4. Siempre mantener el Destino final del conductor
    pts.push({
      latitude: viaje.ubicacion_destino?.coordinates?.[1] || 20.5888,
      longitude: viaje.ubicacion_destino?.coordinates?.[0] || -100.3899,
      title: `Destino Final: ${viaje.nombre_destino || 'Destino'}`,
      color: 'red',
    });
    
    return pts;
  }, [viaje, passengerDropoffCoords, pasajeroDestino, passengerPickupCoords, pasajeroOrigen, sharedAcceptedStops]);

  // ─── Acciones del pasajero ────────────────────────────────────────────────────
  const handleCreateRequest = async () => {
    if (viaje?.asientos_disponibles < 1) {
      Alert.alert('Sin lugares', 'Este viaje ya no cuenta con asientos disponibles.');
      return;
    }

    const saleDeUpq = viaje?.nombre_origen?.includes('UPQ');

    // Dependemos únicamente del sentido del viaje (saleDeUpq) para saber qué pedir,
    // tal como se hace en la UI, para que nunca pida un campo oculto.
    const requiresOrigen = !saleDeUpq;
    const requiresDestino = saleDeUpq;

    if (requiresOrigen && !pasajeroOrigen.trim()) {
      Alert.alert('Origen requerido', 'Por favor ingresa tu punto de partida para recogerte.');
      return;
    }
    
    if (requiresOrigen && (!origenValidado || !passengerPickupCoords)) {
      Alert.alert('Origen no válido', 'Por favor selecciona tu origen desde las sugerencias o tócando en el mapa.');
      return;
    }

    if (requiresDestino && !pasajeroDestino.trim()) {
      Alert.alert('Destino requerido', 'Por favor ingresa el destino al que deseas llegar.');
      return;
    }

    if (requiresDestino && (!destinoValidado || !passengerDropoffCoords)) {
      Alert.alert('Destino no válido', 'Por favor selecciona tu destino desde las sugerencias o tócando en el mapa.');
      return;
    }

    const finalPickupCoords = requiresOrigen ? passengerPickupCoords : {
      latitude: viaje.ubicacion_inicio.coordinates[1],
      longitude: viaje.ubicacion_inicio.coordinates[0]
    };
    
    const finalDropoffCoords = requiresDestino ? passengerDropoffCoords : {
      latitude: viaje.ubicacion_destino.coordinates[1],
      longitude: viaje.ubicacion_destino.coordinates[0]
    };

    // Calculate passenger distance for dynamic pricing
    const passengerDistanceKm = getDistanceKm(finalPickupCoords.latitude, finalPickupCoords.longitude, finalDropoffCoords.latitude, finalDropoffCoords.longitude);
    const calculatedPrice = Math.round(5 + (passengerDistanceKm * 3)); // $5 base + $3 por Km

    // Calculate detour distance from trip destination for driver dashboard
    const tripDestLat = viaje.ubicacion_destino?.coordinates?.[1] || 20.5888;
    const tripDestLon = viaje.ubicacion_destino?.coordinates?.[0] || -100.3899;
    const detourKm = getDistanceKm(tripDestLat, tripDestLon, finalDropoffCoords.latitude, finalDropoffCoords.longitude);
    const detourMeters = Math.round(detourKm * 1000);

    setActionLoading(true);
    try {
      const solData = {
        id_viaje: viajeId,
        id_pasajero: user.id,
        id_metodo_pago: 1, // Efectivo (default)
        id_estatus: 1, // Pendiente
        ubicacion_recogida: {
          type: 'Point',
          coordinates: [finalPickupCoords.longitude, finalPickupCoords.latitude],
        },
        ubicacion_bajada: {
          type: 'Point',
          coordinates: [finalDropoffCoords.longitude, finalDropoffCoords.latitude],
        },
        desvio_metros: detourMeters,
        precio: calculatedPrice,
        notas_adicionales: `Origen: ${requiresOrigen ? pasajeroOrigen : 'UPQ'}, Destino: ${requiresDestino ? pasajeroDestino : 'UPQ'}`,
      };
      await crearSolicitud(solData);
      Alert.alert('Solicitud enviada', 'Tu solicitud fue enviada al conductor para su revisión.');
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

  // ─── Acciones del conductor ───────────────────────────────────────────────────
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

  const handleReportarEventualidad = async () => {
    Alert.alert(
      'Reportar Eventualidad',
      '¿Ocurrió un accidente o factor externo que te impide realizar el viaje? Al reportarlo, se cancelará el viaje sin aplicar sanciones en tu cuenta.',
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Sí, reportar',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              // Enviar el id_estatus 4 (Cancelado)
              await actualizarViaje(viajeId, { id_estatus: 4 });
              Alert.alert('Eventualidad Reportada', 'El viaje ha sido cancelado exitosamente. No se te aplicarán penalizaciones.');
              loadData();
            } catch (err) {
              Alert.alert('Error', err.displayMessage || 'No se pudo reportar la eventualidad.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Calculate dynamic price preview based on what the passenger has selected so far.
  // This MUST be before any early return to follow the Rules of Hooks.
  const previewPrice = useMemo(() => {
    if (!viaje) return null;
    const tripSaleDeUpq = viaje?.nombre_origen?.includes('UPQ');
    const tripStartLat = viaje.ubicacion_inicio?.coordinates?.[1] || 20.5891;
    const tripStartLon = viaje.ubicacion_inicio?.coordinates?.[0] || -100.4376;
    const tripEndLat = viaje.ubicacion_destino?.coordinates?.[1] || 20.5888;
    const tripEndLon = viaje.ubicacion_destino?.coordinates?.[0] || -100.3899;

    let pickupLat, pickupLon, dropoffLat, dropoffLon;
    if (tripSaleDeUpq) {
      pickupLat = tripStartLat; pickupLon = tripStartLon;
      if (passengerDropoffCoords) {
        dropoffLat = passengerDropoffCoords.latitude; dropoffLon = passengerDropoffCoords.longitude;
      }
    } else {
      if (passengerPickupCoords) {
        pickupLat = passengerPickupCoords.latitude; pickupLon = passengerPickupCoords.longitude;
      }
      dropoffLat = tripEndLat; dropoffLon = tripEndLon;
    }
    if (!pickupLat || !dropoffLat) return null;
    const distKm = getDistanceKm(pickupLat, pickupLon, dropoffLat, dropoffLon);
    return Math.round(5 + distKm * 3);
  }, [viaje, passengerPickupCoords, passengerDropoffCoords]);

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
  
  const saleDeUpq = viaje?.nombre_origen?.includes('UPQ');

  // Determines what a passenger must provide:
  // - If trip starts at UPQ: passenger only sets their DROP-OFF (destination)
  // - If trip ends at UPQ: passenger only sets their PICK-UP (origin)
  // In both cases, only ONE field is ever shown.
  const singleFieldLabel = saleDeUpq ? 'Agregar destino' : 'Agregar punto de recogida';
  const singleFieldPlaceholder = saleDeUpq
    ? 'Ej. Plaza del Parque, Av. Constituyentes...'
    : 'Ej. Tu colonia o lugar de partida';
  const singleFieldIcon = saleDeUpq ? 'location-sharp' : 'navigate-circle-outline';
  const singleFieldIconColor = saleDeUpq ? COLORS.danger : COLORS.primary;
  const singleFieldValue = saleDeUpq ? pasajeroDestino : pasajeroOrigen;
  const singleFieldValidado = saleDeUpq ? destinoValidado : origenValidado;

  return (
    <SafeAreaView style={styles.container}>
      <TopHeader title="Detalle del Viaje" showBack onBackPress={() => navigation.navigate(isDriver ? 'MainTabs' : 'PassengerDashboard')} />
      <LoadingOverlay visible={actionLoading} message="Procesando acción..." />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
                <Text style={styles.infoVal}>{viaje.vehiculo.modelo}</Text>
                <VehicleColorBadge colorName={viaje.vehiculo.color} style={{ marginLeft: 6 }} />
              </View>
            )}
          </View>

          {/* MAPA PRINCIPAL DE LA RUTA — incluye paradas aceptadas dinámicamente */}
          <View style={styles.mapHeaderRow}>
            <Text style={[styles.sectionTitle, { marginTop: 16, marginBottom: 0 }]}>Ruta en el Mapa</Text>
            {mainMapWaypoints.length > 2 && (
              <View style={styles.stopsBadge}>
                <Ionicons name="location" size={12} color="#FFF" />
                <Text style={styles.stopsBadgeText}>{mainMapWaypoints.length - 2} parada{mainMapWaypoints.length - 2 !== 1 ? 's' : ''}</Text>
              </View>
            )}
          </View>
          <MapaRutas
            interactive={false}
            height={220}
            waypoints={mainMapWaypoints}
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
              <View style={styles.driverAvatarWrapper}>
                {viaje.vehiculo.conductor.usuario.url_foto_perfil &&
                viaje.vehiculo.conductor.usuario.url_foto_perfil !== 'cardenal_upq.png' ? (
                  <Image
                    source={{ uri: `${API_BASE_URL}/${viaje.vehiculo.conductor.usuario.url_foto_perfil}` }}
                    style={styles.driverAvatarImg}
                  />
                ) : (
                  <View style={styles.driverAvatar}>
                    <Text style={styles.avatarText}>
                      {viaje.vehiculo.conductor.usuario.nombre_completo.charAt(0)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{viaje.vehiculo.conductor.usuario.nombre_completo}</Text>
                <Text style={styles.driverCal}>
                  ⭐ {parseFloat(viaje.vehiculo.conductor.usuario.calificacion_conductor).toFixed(1)} / 5.0 como conductor
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {/* VEHICLE PHOTOS */}
            {viaje.vehiculo?.fotos && Array.isArray(viaje.vehiculo.fotos) && viaje.vehiculo.fotos.length > 0 && (
              <View style={styles.vehiclePhotosContainer}>
                <Text style={styles.vehiclePhotosTitle}>📸 Fotos del Vehículo</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={styles.vehiclePhotosSubtitle}>
                    {viaje.vehiculo.modelo} · Placa: {viaje.vehiculo.placa}
                  </Text>
                  <VehicleColorBadge colorName={viaje.vehiculo.color} style={{ marginLeft: 8 }} />
                </View>
                <View style={styles.vehiclePhotosList}>
                  {viaje.vehiculo.fotos.map((foto, index) => (
                    <Image
                      key={index}
                      source={{ uri: `${API_BASE_URL}/${foto}` }}
                      style={styles.vehiclePhotoImg}
                    />
                  ))}
                </View>
              </View>
            )}
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
                    style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
                    onPress={() => handleUpdateTripStatus(2, 'En curso')}
                  >
                    <Ionicons name="play" size={16} color="#FFF" />
                    <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Iniciar viaje</Text>
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
            {(viaje.id_estatus === 1 || viaje.id_estatus === 2) && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#475569', marginTop: 12 }]}
                onPress={handleReportarEventualidad}
              >
                <Ionicons name="warning-outline" size={16} color="#FFF" />
                <Text style={styles.actionBtnText}>Reportar Eventualidad (Factor externo)</Text>
              </TouchableOpacity>
            )}
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

                    {/* Price passenger will pay */}
                    {(() => {
                      const priceToPay = item.precio ? parseFloat(item.precio).toFixed(2) : null;
                      return priceToPay && (
                        <View style={styles.passengerPriceBox}>
                          <Ionicons name="cash" size={14} color={COLORS.success} />
                          <Text style={styles.passengerPriceText}>
                            Aportación estimada: <Text style={{ fontWeight: 'bold' }}>${priceToPay} MXN</Text>
                          </Text>
                        </View>
                      );
                    })()}

                    <TouchableOpacity
                      style={styles.destDetourBox}
                      activeOpacity={0.7}
                      onPress={() => setExpandedMaps(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                    >
                      <Ionicons name="location" size={16} color={COLORS.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.destText}>Destino solicitado: <Text style={{ fontWeight: 'bold' }}>{reqDestName}</Text></Text>
                        <Text style={styles.detourText}>
                          📍 Desvío estimado: {detourKm > 0.1 ? `+${detourKm.toFixed(1)} km (~${detourMin} min extra)` : 'En la ruta directa (0 km desvío)'}
                        </Text>
                        <Text style={{ fontSize: 11, color: COLORS.primary, marginTop: 4, fontWeight: 'bold' }}>
                          {expandedMaps[item.id] ? 'Ocultar mapa' : 'Ver ruta en mapa'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {expandedMaps[item.id] && (
                      <View style={{ marginTop: 10, borderRadius: 8, overflow: 'hidden' }}>
                        <MapaRutas
                          interactive={false}
                          height={160}
                          waypoints={[
                            { latitude: viaje.ubicacion_inicio?.coordinates?.[1] || 20.5891, longitude: viaje.ubicacion_inicio?.coordinates?.[0] || -100.4376, title: 'Origen Conductor', color: 'green' },
                            ...sharedAcceptedStops,
                            ...(item.id_estatus !== 3 && item.ubicacion_recogida?.coordinates ? [{ latitude: item.ubicacion_recogida.coordinates[1], longitude: item.ubicacion_recogida.coordinates[0], title: 'Subida Solicitada', color: '#3b82f6' }] : []),
                            ...(item.id_estatus !== 3 && item.ubicacion_bajada?.coordinates ? [{ latitude: item.ubicacion_bajada.coordinates[1], longitude: item.ubicacion_bajada.coordinates[0], title: 'Bajada Solicitada', color: '#f97316' }] : []),
                            { latitude: tripDestLat, longitude: tripDestLon, title: 'Destino Final', color: 'red' }
                          ]}
                        />
                      </View>
                    )}

                    {/* AI RECOMMENDATION BOX */}
                    {aiEvaluations[item.id] && (
                      <View style={[styles.aiBox, aiEvaluations[item.id].recommendation === 'ACCEPT' ? styles.aiAccept : styles.aiReject]}>
                        <Ionicons name={aiEvaluations[item.id].recommendation === 'ACCEPT' ? 'checkmark-circle' : 'warning'} size={18} color={aiEvaluations[item.id].recommendation === 'ACCEPT' ? '#065F46' : '#991B1B'} />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={[styles.aiTitle, { color: aiEvaluations[item.id].recommendation === 'ACCEPT' ? '#065F46' : '#991B1B' }]}>
                            Evaluación IA: {Math.round(aiEvaluations[item.id].score * 100)}% de conveniencia
                          </Text>
                          <Text style={[styles.aiSub, { color: aiEvaluations[item.id].recommendation === 'ACCEPT' ? '#065F46' : '#991B1B' }]}>
                            {aiEvaluations[item.id].recommendation === 'ACCEPT' ? 'Recomendado: Aceptar (buen beneficio)' : 'Recomendado: Rechazar (desvío excesivo para la tarifa)'}
                          </Text>
                        </View>
                      </View>
                    )}

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
                <Card style={styles.requestFormCard}>
                  <Text style={styles.sectionTitle}>Solicitar Asiento</Text>

                  {/* ─── SINGLE LOCATION FIELD ─── */}
                  <LocationSearchInput
                    label={singleFieldLabel}
                    placeholder={singleFieldPlaceholder}
                    value={singleFieldValue}
                    onChangeText={(text) => {
                      if (saleDeUpq) {
                        setPasajeroDestino(text);
                        setDestinoValidado(false);
                        setPassengerDropoffCoords(null);
                      } else {
                        setPasajeroOrigen(text);
                        setOrigenValidado(false);
                        setPassengerPickupCoords(null);
                      }
                    }}
                    iconName={singleFieldIcon}
                    iconColor={singleFieldIconColor}
                    onSelectLocation={(loc) => {
                      if (saleDeUpq) {
                        setPasajeroDestino(loc.address || loc.name);
                        setPassengerDropoffCoords({ latitude: loc.latitude, longitude: loc.longitude });
                        setDestinoValidado(true);
                      } else {
                        setPasajeroOrigen(loc.address || loc.name);
                        setPassengerPickupCoords({ latitude: loc.latitude, longitude: loc.longitude });
                        setOrigenValidado(true);
                      }
                    }}
                    style={{ zIndex: 30 }}
                  />

                  {/* Validation status */}
                  {singleFieldValue.length > 0 && (
                    <View style={[styles.validationRow, singleFieldValidado ? styles.validationOk : styles.validationWarn]}>
                      <Ionicons
                        name={singleFieldValidado ? 'checkmark-circle' : 'alert-circle-outline'}
                        size={15}
                        color={singleFieldValidado ? COLORS.success : '#D97706'}
                      />
                      <Text style={[styles.validationText, { color: singleFieldValidado ? COLORS.success : '#D97706' }]}>
                        {singleFieldValidado ? 'Ubicación verificada' : 'Selecciona una sugerencia o toca el mapa'}
                      </Text>
                    </View>
                  )}

                  {/* Map hint */}
                  <View style={styles.passengerMapHeader}>
                    <Ionicons name="map-outline" size={15} color={COLORS.textSecondary} />
                    <Text style={styles.passengerMapLabel}>
                      {saleDeUpq
                        ? 'Toca el mapa para fijar tu destino de bajada'
                        : 'Toca el mapa para fijar tu punto de recogida'}
                    </Text>
                  </View>

                  {/* Interactive map */}
                  <MapaRutas
                    interactive={true}
                    height={200}
                    waypoints={requestMapWaypoints}
                    onMapPress={(coord) => {
                      if (saleDeUpq) {
                        setPassengerDropoffCoords({ latitude: coord.latitude, longitude: coord.longitude });
                        if (coord.address) setPasajeroDestino(coord.address);
                        setDestinoValidado(true);
                      } else {
                        setPassengerPickupCoords({ latitude: coord.latitude, longitude: coord.longitude });
                        if (coord.address) setPasajeroOrigen(coord.address);
                        setOrigenValidado(true);
                      }
                    }}
                  />

                  {/* Dynamic price preview for passenger */}
                  {previewPrice != null && (
                    <View style={styles.pricePreviewBox}>
                      <Ionicons name="cash-outline" size={18} color={COLORS.success} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.pricePreviewTitle}>Aportación estimada</Text>
                        <Text style={styles.pricePreviewValue}>${previewPrice} MXN</Text>
                        <Text style={styles.pricePreviewNote}>
                          Calculada según la distancia de tu recorrido ($5 base + $3/km)
                        </Text>
                      </View>
                    </View>
                  )}

                  <PrimaryButton
                    title={viaje.asientos_disponibles > 0 ? 'Enviar Solicitud al Conductor' : 'Sin lugares disponibles'}
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
      </KeyboardAvoidingView>
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
  // Map header with stops badge
  mapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 4,
  },
  stopsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  stopsBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
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
  driverAvatarWrapper: {
    marginRight: 12,
  },
  driverAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  vehiclePhotosContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  vehiclePhotosTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  vehiclePhotosSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  vehiclePhotosList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vehiclePhotoImg: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  // Request form card
  requestFormCard: {
    padding: 16,
  },
  // Validation indicator
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 12,
    marginTop: -6,
  },
  validationOk: {
    backgroundColor: '#D1FAE5',
  },
  validationWarn: {
    backgroundColor: '#FEF3C7',
  },
  validationText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  // Passenger map section
  passengerMapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  passengerMapLabel: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  clearMapBtn: {
    padding: 2,
  },
  requestBtn: {
    marginTop: 12,
    marginBottom: 4,
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
  aiBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  aiAccept: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#34D399',
  },
  aiReject: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
  },
  aiTitle: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  aiSub: {
    fontSize: 12,
    marginTop: 2,
  },
  aiBtn: {
    backgroundColor: '#6366F1', // Indigo
  },
  aiBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectorModeRow: {
    marginBottom: 8,
  },
  selectorLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  selectorBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeBtnActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  modeBtnText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: '#1D4ED8',
  },
  pricePreviewBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  pricePreviewTitle: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
    marginBottom: 2,
  },
  pricePreviewValue: {
    fontSize: 20,
    color: '#15803D',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  pricePreviewNote: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 14,
  },
  passengerPriceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    gap: 6,
  },
  passengerPriceText: {
    fontSize: 12,
    color: '#166534',
  },
});
