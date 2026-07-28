import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { getMe, getUsuario } from '../src/api/usuariosApi';
import {
  getRelacionesSociales,
  enviarSolicitudAmistad,
  actualizarRelacionSocial,
  eliminarAmistad,
  getChatDirecto
} from '../src/api/socialApi';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import Card from '../components/Card';

export default function ProfileScreen({ navigation, route }) {
  const { user, isPassenger, logout, updateRole } = useAuth();
  const { usuarioId } = route.params || {};
  const esPropioPerfil = !usuarioId || String(usuarioId) === String(user.id);

  const [profile, setProfile] = useState(null);
  const [relacion, setRelacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socialLoading, setSocialLoading] = useState(false);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      if (esPropioPerfil) {
        const data = await getMe();
        setProfile(data);
      } else {
        const [profileData, relaciones] = await Promise.all([
          getUsuario(usuarioId),
          getRelacionesSociales(user.id)
        ]);
        setProfile(profileData);
        
        // Buscar relacion con este usuario
        const rel = relaciones.find(
          r => String(r.id_usuario1) === String(usuarioId) || String(r.id_usuario2) === String(usuarioId)
        );
        setRelacion(rel || null);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      Alert.alert('Error', 'No se pudo cargar la información del perfil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [usuarioId]);

  const handleAgregarAmigo = async () => {
    setSocialLoading(true);
    try {
      const rel = await enviarSolicitudAmistad(user.id, usuarioId);
      setRelacion(rel);
      Alert.alert('Solicitud enviada', `Se ha enviado una solicitud de amistad a ${profile.nombre_completo}.`);
    } catch (error) {
      const msg = error?.response?.data?.detail || 'No se pudo enviar la solicitud.';
      Alert.alert('Error', msg);
    } finally {
      setSocialLoading(false);
    }
  };

  const handleAceptarAmistad = async () => {
    if (!relacion) return;
    setSocialLoading(true);
    try {
      const rel = await actualizarRelacionSocial(relacion.id, 2); // 2 = Amigos
      setRelacion(rel);
      Alert.alert('Amistad aceptada', `Ahora eres amigo de ${profile.nombre_completo}.`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo aceptar la solicitud.');
    } finally {
      setSocialLoading(false);
    }
  };

  const handleEliminarAmigo = () => {
    if (!relacion) return;
    Alert.alert(
      'Eliminar Amigo',
      `¿Deseas eliminar a ${profile.nombre_completo} de tus amigos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setSocialLoading(true);
            try {
              await eliminarAmistad(relacion.id);
              setRelacion(null);
              Alert.alert('Amigo eliminado', `${profile.nombre_completo} ha sido eliminado de tus amigos.`);
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar al amigo.');
            } finally {
              setSocialLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleBloquearUsuario = () => {
    Alert.alert(
      'Bloquear Usuario',
      `¿Deseas bloquear a ${profile.nombre_completo}? No volverán a coincidir en viajes y no podrán comunicarse.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            setSocialLoading(true);
            try {
              if (relacion) {
                const rel = await actualizarRelacionSocial(relacion.id, 3); // 3 = Bloqueado
                setRelacion(rel);
              } else {
                // Crear relacion pendiente y luego bloquear
                const relTemp = await enviarSolicitudAmistad(user.id, usuarioId);
                const rel = await actualizarRelacionSocial(relTemp.id, 3);
                setRelacion(rel);
              }
              Alert.alert('Usuario bloqueado', `${profile.nombre_completo} ha sido bloqueado.`);
            } catch (error) {
              Alert.alert('Error', 'No se pudo bloquear al usuario.');
            } finally {
              setSocialLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDesbloquearUsuario = async () => {
    if (!relacion) return;
    setSocialLoading(true);
    try {
      await eliminarAmistad(relacion.id);
      setRelacion(null);
      Alert.alert('Usuario desbloqueado', `${profile.nombre_completo} ha sido desbloqueado.`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo desbloquear al usuario.');
    } finally {
      setSocialLoading(false);
    }
  };

  const handleChatearConAmigo = async () => {
    setSocialLoading(true);
    try {
      const chat = await getChatDirecto(usuarioId);
      navigation.navigate('Chat', {
        chatId: chat.id,
        otroUsuarioId: usuarioId,
        otroUsuarioNombre: profile.nombre_completo,
        viajeInfo: null
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo iniciar el chat con este amigo.');
    } finally {
      setSocialLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  const calConductor = profile?.calificacion_conductor ? parseFloat(profile.calificacion_conductor).toFixed(1) : '5.0';
  const calPasajero = profile?.calificacion_pasajero ? parseFloat(profile.calificacion_pasajero).toFixed(1) : '5.0';
  const initials = profile?.nombre_completo ? profile.nombre_completo.split(' ').map(n => n[0]).slice(0, 2).join('') : 'C';

  const handleRoleChange = (newRole) => {
    // Navegar al dashboard correcto y limpiar el historial de navegación
    navigation.reset({
      index: 0,
      routes: [{ name: newRole === 'Conductor' ? 'DriverDashboard' : 'PassengerDashboard' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopHeader 
        title={esPropioPerfil ? "Mi Perfil" : "Perfil de " + (profile?.nombre_completo?.split(' ')[0] || '')} 
        showBack 
        onBackPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate(isPassenger ? 'PassengerDashboard' : 'DriverDashboard');
          }
        }} 
      />

      <ScrollView contentContainerStyle={styles.content}>
        {profile && (
          <View style={styles.profileHeader}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.name}>{profile.nombre_completo}</Text>
            <Text style={styles.matricula}>Matrícula: {profile.matricula}</Text>
            <Text style={styles.email}>{profile.correo_institucional}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {esPropioPerfil ? (user?.role || 'Estudiante') : (profile.conductor ? 'Conductor' : 'Pasajero')}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>⭐ {calPasajero}</Text>
            <Text style={styles.statLabel}>Como Pasajero</Text>
          </Card>
          {(esPropioPerfil ? !isPassenger : profile?.conductor) && (
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>⭐ {calConductor}</Text>
              <Text style={styles.statLabel}>Como Conductor</Text>
            </Card>
          )}
        </View>

        {esPropioPerfil ? (
          <>
            {user?.originalRole === 'Conductor' && isPassenger && (
              <TouchableOpacity
                style={styles.driverBanner}
                activeOpacity={0.9}
                onPress={() => updateRole('Conductor', handleRoleChange)}
              >
                <Text style={styles.bannerTitle}>Cambiar a Conductor</Text>
                <Text style={styles.bannerSub}>Vuelve a tu perfil de conductor para publicar viajes.</Text>
                <View style={styles.bannerButton}>
                  <Text style={styles.bannerBtnText}>Cambiar Perfil</Text>
                </View>
              </TouchableOpacity>
            )}

            {user?.originalRole === 'Conductor' && !isPassenger && (
              <TouchableOpacity
                style={[styles.driverBanner, { backgroundColor: COLORS.success }]}
                activeOpacity={0.9}
                onPress={() => updateRole('Pasajero', handleRoleChange)}
              >
                <Text style={styles.bannerTitle}>Cambiar a Pasajero</Text>
                <Text style={styles.bannerSub}>Usa la app como pasajero para solicitar viajes.</Text>
                <View style={styles.bannerButton}>
                  <Text style={[styles.bannerBtnText, { color: COLORS.success }]}>Cambiar Perfil</Text>
                </View>
              </TouchableOpacity>
            )}

            {user?.originalRole !== 'Conductor' && isPassenger && (
              <TouchableOpacity
                style={styles.driverBanner}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('DriverRegistration')}
              >
                <Text style={styles.bannerTitle}>Conviértete en conductor</Text>
                <Text style={styles.bannerSub}>Comparte tu ruta con la comunidad de la UPQ y divide gastos.</Text>
                <View style={styles.bannerButton}>
                  <Text style={styles.bannerBtnText}>Registrar Vehículo</Text>
                </View>
              </TouchableOpacity>
            )}

            <Card style={styles.menuCard}>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Friends')}>
                <View style={styles.menuLeft}>
                  <Ionicons name="people-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.menuText}>Mis Amigos</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ChatList')}>
                <View style={styles.menuLeft}>
                  <Ionicons name="chatbubbles-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.menuText}>Bandeja de Chats</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.menuItem}>
                <View style={styles.menuLeft}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.menuText}>Privacidad y Seguridad</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.menuItem}>
                <View style={styles.menuLeft}>
                  <Ionicons name="help-circle-outline" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.menuText}>Centro de ayuda</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </Card>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Text style={styles.logoutText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* SOCIAL ACTIONS VIEW WHEN VIEWING ANOTHER USER'S PROFILE */
          <Card style={styles.socialActionsCard}>
            <Text style={styles.socialActionsTitle}>Acciones Sociales</Text>
            
            {socialLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 12 }} />
            ) : (
              <View style={styles.socialBtnsContainer}>
                {/* AMISTAD BUTTONS */}
                {!relacion && (
                  <TouchableOpacity style={[styles.socialBtn, styles.primaryBtn]} onPress={handleAgregarAmigo}>
                    <Ionicons name="person-add" size={20} color="#FFF" />
                    <Text style={styles.socialBtnText}>Agregar Amigo</Text>
                  </TouchableOpacity>
                )}

                {relacion && relacion.id_estatus_social === 1 && relacion.id_usuario1 === user.id && (
                  <TouchableOpacity style={[styles.socialBtn, styles.disabledBtn]} disabled>
                    <Ionicons name="paper-plane" size={20} color="#666" />
                    <Text style={[styles.socialBtnText, { color: '#666' }]}>Solicitud Enviada</Text>
                  </TouchableOpacity>
                )}

                {relacion && relacion.id_estatus_social === 1 && relacion.id_usuario2 === user.id && (
                  <View style={styles.receivedContainer}>
                    <Text style={styles.receivedText}>¡Te ha enviado una solicitud de amistad!</Text>
                    <View style={styles.row}>
                      <TouchableOpacity style={[styles.socialBtn, styles.successBtn, { flex: 1, marginRight: 8 }]} onPress={handleAceptarAmistad}>
                        <Ionicons name="checkmark" size={18} color="#FFF" />
                        <Text style={styles.socialBtnText}>Aceptar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.socialBtn, styles.dangerBtn, { flex: 1 }]} onPress={handleDesbloquearUsuario}>
                        <Ionicons name="close" size={18} color="#FFF" />
                        <Text style={styles.socialBtnText}>Rechazar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {relacion && relacion.id_estatus_social === 2 && (
                  <View style={{ width: '100%' }}>
                    <View style={[styles.socialBtn, styles.friendBadge]}>
                      <Ionicons name="people" size={20} color="#059669" />
                      <Text style={styles.friendBadgeText}>Ya son amigos</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.socialBtn, styles.primaryBtn, { marginTop: 10 }]}
                      onPress={handleChatearConAmigo}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="chatbubbles-outline" size={20} color="#FFF" />
                      <Text style={styles.socialBtnText}>Chatear con amigo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.socialBtn, styles.dangerOutlineBtn, { marginTop: 10 }]} onPress={handleEliminarAmigo}>
                      <Ionicons name="person-remove" size={18} color={COLORS.danger} />
                      <Text style={styles.dangerOutlineBtnText}>Eliminar Amigo</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* BLOQUEO BUTTONS */}
                {relacion && relacion.id_estatus_social === 3 && relacion.id_usuario1 === user.id ? (
                  <View style={{ width: '100%', marginTop: 12 }}>
                    <Text style={styles.blockedText}>Has bloqueado a este usuario.</Text>
                    <TouchableOpacity style={[styles.socialBtn, styles.warningBtn]} onPress={handleDesbloquearUsuario}>
                      <Ionicons name="lock-open-outline" size={20} color="#1E293B" />
                      <Text style={[styles.socialBtnText, { color: '#1E293B' }]}>Desbloquear</Text>
                    </TouchableOpacity>
                  </View>
                ) : relacion && relacion.id_estatus_social === 3 ? (
                  <View style={{ width: '100%', marginTop: 12 }}>
                    <Text style={styles.blockedText}>Este usuario te ha bloqueado.</Text>
                  </View>
                ) : (
                  (!relacion || relacion.id_estatus_social !== 3) && (
                    <TouchableOpacity style={[styles.socialBtn, styles.dangerOutlineBtn, { marginTop: 12 }]} onPress={handleBloquearUsuario}>
                      <Ionicons name="ban-outline" size={20} color={COLORS.danger} />
                      <Text style={styles.dangerOutlineBtnText}>Bloquear Usuario</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            )}
          </Card>
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
  content: {
    padding: SIZES.padding,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 3,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFF',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  matricula: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  email: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 10,
  },
  badge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 0,
    paddingVertical: 14,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  driverBanner: {
    backgroundColor: COLORS.primary,
    padding: 20,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
  },
  bannerTitle: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bannerSub: {
    color: COLORS.surface,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.9,
    lineHeight: 18,
  },
  bannerButton: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  bannerBtnText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  menuCard: {
    paddingVertical: 0,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },
  logoutBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  logoutText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  socialActionsCard: {
    padding: 16,
    marginTop: 8,
  },
  socialActionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  socialBtnsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
  },
  successBtn: {
    backgroundColor: COLORS.success,
  },
  dangerBtn: {
    backgroundColor: COLORS.danger,
  },
  warningBtn: {
    backgroundColor: COLORS.warning,
  },
  disabledBtn: {
    backgroundColor: '#E2E8F0',
  },
  socialBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dangerOutlineBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    backgroundColor: 'transparent',
  },
  dangerOutlineBtnText: {
    color: COLORS.danger,
    fontWeight: 'bold',
    fontSize: 14,
  },
  friendBadge: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#34D399',
  },
  friendBadgeText: {
    color: '#065F46',
    fontWeight: 'bold',
    fontSize: 14,
  },
  receivedContainer: {
    width: '100%',
    alignItems: 'center',
  },
  receivedText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  blockedText: {
    fontSize: 14,
    color: COLORS.danger,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
});