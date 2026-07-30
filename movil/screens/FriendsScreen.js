import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import { useAuth } from '../src/context/AuthContext';
import {
  getRelacionesSociales,
  getSolicitudesPendientes,
  actualizarRelacionSocial,
  eliminarAmistad,
  enviarSolicitudAmistad,
  buscarUsuarios,
  getChatDirecto,
} from '../src/api/socialApi';

const TABS = ['Amigos', 'Solicitudes', 'Enviadas', 'Bloqueados'];
const ESTATUS = { PENDIENTE: 1, AMIGOS: 2, BLOQUEADO: 3 };

export default function FriendsScreen({ navigation }) {
  const { user } = useAuth();
  const [tabActual, setTabActual] = useState(0);
  const [amigos, setAmigos] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [enviadas, setEnviadas] = useState([]);
  // Usuarios que YO bloqueé (id_usuario1 === user.id && estatus BLOQUEADO)
  const [bloqueados, setBloqueados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const debounceRef = React.useRef(null);

  const cargarTodo = useCallback(async () => {
    setLoading(true);
    try {
      const [todas, pend] = await Promise.all([
        getRelacionesSociales(user.id),
        getSolicitudesPendientes(user.id),
      ]);

      setAmigos(todas.filter((r) => r.id_estatus_social === ESTATUS.AMIGOS));
      setPendientes(pend);
      setEnviadas(
        todas.filter(
          (r) => r.id_estatus_social === ESTATUS.PENDIENTE && r.id_usuario1 === user.id
        )
      );

      // ── Bloqueos: solo los que YO inicié (id_usuario1 === user.id) ──────────
      // Si el usuario bloqueado intenta ver sus relaciones, esta relación
      // tiene id_usuario1 = el que lo bloqueó ≠ user.id, así que no aparece aquí.
      setBloqueados(
        todas.filter(
          (r) => r.id_estatus_social === ESTATUS.BLOQUEADO && r.id_usuario1 === user.id
        )
      );
    } catch (err) {
      console.warn('[FriendsScreen]', err?.message);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  // Búsqueda con debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (busqueda.trim().length < 2) {
      setResultadosBusqueda([]);
      return;
    }
    setBuscando(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await buscarUsuarios(busqueda.trim(), user.id);
        setResultadosBusqueda(res);
      } catch {
        setResultadosBusqueda([]);
      } finally {
        setBuscando(false);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [busqueda, user.id]);

  const handleChatear = async (otro) => {
    if (!otro) return;
    setLoading(true);
    try {
      const chat = await getChatDirecto(otro.id);
      navigation.navigate('Chat', {
        chatId: chat.id,
        otroUsuarioId: otro.id,
        otroUsuarioNombre: otro.nombre_completo,
        viajeInfo: null,
      });
    } catch (err) {
      Alert.alert('Error', 'No se pudo abrir el chat con este amigo.');
    } finally {
      setLoading(false);
    }
  };

  const handleAceptar = async (relacion) => {
    try {
      await actualizarRelacionSocial(relacion.id, ESTATUS.AMIGOS);
      await cargarTodo();
    } catch {
      Alert.alert('Error', 'No se pudo aceptar la solicitud.');
    }
  };

  const handleRechazar = async (relacion) => {
    try {
      await eliminarAmistad(relacion.id);
      await cargarTodo();
    } catch {
      Alert.alert('Error', 'No se pudo rechazar la solicitud.');
    }
  };

  const handleBloquear = (relacion) => {
    // Solo quien inicia el bloqueo puede bloquearlo → se asegura poniendo id_usuario1 = user.id
    const otroPerson = relacion.id_usuario1 === user.id
      ? relacion.usuario2?.nombre_completo
      : relacion.usuario1?.nombre_completo;
    Alert.alert(
      'Bloquear usuario',
      `¿Seguro que deseas bloquear a ${otroPerson}? No volverán a coincidir en viajes.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Asegurarse de que el bloqueo queda registrado con user.id como usuario1
              // La API acepta el id de la relación existente y actualiza su estatus
              await actualizarRelacionSocial(relacion.id, ESTATUS.BLOQUEADO);
              await cargarTodo();
            } catch {
              Alert.alert('Error', 'No se pudo bloquear al usuario.');
            }
          },
        },
      ]
    );
  };

  const handleDesbloquear = (relacion) => {
    // Solo el que bloqueó (id_usuario1 === user.id) puede desbloquear
    const bloqueadoNombre = relacion.usuario2?.nombre_completo || 'este usuario';
    Alert.alert(
      'Desbloquear usuario',
      `¿Deseas desbloquear a ${bloqueadoNombre}? Podrán volver a coincidir en viajes.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desbloquear',
          onPress: async () => {
            try {
              // Eliminar la relación para restaurar el estado neutral
              await eliminarAmistad(relacion.id);
              await cargarTodo();
              Alert.alert('Desbloqueado', `Has desbloqueado a ${bloqueadoNombre}.`);
            } catch {
              Alert.alert('Error', 'No se pudo desbloquear al usuario.');
            }
          },
        },
      ]
    );
  };

  const handleEliminarAmigo = (relacion) => {
    const otroPerson = relacion.id_usuario1 === user.id
      ? relacion.usuario2?.nombre_completo
      : relacion.usuario1?.nombre_completo;
    Alert.alert(
      'Eliminar amigo',
      `¿Eliminar a ${otroPerson} de tus amigos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarAmistad(relacion.id);
              await cargarTodo();
            } catch {
              Alert.alert('Error', 'No se pudo eliminar la amistad.');
            }
          },
        },
      ]
    );
  };

  const handleEnviarSolicitud = async (otroUsuario) => {
    try {
      await enviarSolicitudAmistad(user.id, otroUsuario.id);
      setBusqueda('');
      setResultadosBusqueda([]);
      await cargarTodo();
      Alert.alert('¡Solicitud enviada!', `Se envió la solicitud a ${otroUsuario.nombre_completo}.`);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'No se pudo enviar la solicitud.';
      Alert.alert('Error', msg);
    }
  };

  const getOtroUsuario = (relacion) =>
    relacion.id_usuario1 === user.id ? relacion.usuario2 : relacion.usuario1;

  // ─── RENDER ITEMS ─────────────────────────────────────────
  const renderAmigo = ({ item }) => {
    const otro = getOtroUsuario(item);
    return (
      <View style={styles.userCard}>
        <TouchableOpacity
          style={styles.userInfoTouchable}
          onPress={() => navigation.navigate('Profile', { usuarioId: otro?.id })}
          activeOpacity={0.7}
        >
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{(otro?.nombre_completo || 'U').charAt(0)}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{otro?.nombre_completo || 'Usuario'}</Text>
            <Text style={styles.userSub}>
              ⭐ {parseFloat(otro?.calificacion_pasajero || 5).toFixed(1)} pasajero
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => handleChatear(otro)}>
            <Ionicons name="chatbubbles-outline" size={17} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => handleBloquear(item)}>
            <Ionicons name="ban-outline" size={17} color={COLORS.danger} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => handleEliminarAmigo(item)}>
            <Ionicons name="person-remove-outline" size={17} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPendiente = ({ item }) => {
    const solicitante = item.usuario1;
    return (
      <View style={styles.userCard}>
        <View style={[styles.userAvatar, { backgroundColor: '#F59E0B' }]}>
          <Text style={styles.userAvatarText}>{(solicitante?.nombre_completo || 'U').charAt(0)}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{solicitante?.nombre_completo || 'Usuario'}</Text>
          <Text style={styles.userSub}>Quiere ser tu amigo/a</Text>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAceptar(item)}>
            <Ionicons name="checkmark" size={18} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRechazar(item)}>
            <Ionicons name="close" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEnviada = ({ item }) => {
    const otro = item.usuario2;
    return (
      <View style={styles.userCard}>
        <View style={[styles.userAvatar, { backgroundColor: '#94A3B8' }]}>
          <Text style={styles.userAvatarText}>{(otro?.nombre_completo || 'U').charAt(0)}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{otro?.nombre_completo || 'Usuario'}</Text>
          <Text style={styles.userSub}>Solicitud pendiente</Text>
        </View>
        <TouchableOpacity style={styles.cancelSolicitudBtn} onPress={() => handleRechazar(item)}>
          <Text style={styles.cancelSolicitudText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBloqueado = ({ item }) => {
    // Cuando yo bloqueé: id_usuario1 = user.id, id_usuario2 = bloqueado
    const bloqueado = item.usuario2;
    return (
      <View style={styles.userCard}>
        <TouchableOpacity
          style={styles.userInfoTouchable}
          onPress={() => navigation.navigate('Profile', { usuarioId: bloqueado?.id })}
          activeOpacity={0.7}
        >
          <View style={[styles.userAvatar, { backgroundColor: '#94A3B8' }]}>
            <Text style={styles.userAvatarText}>{(bloqueado?.nombre_completo || 'U').charAt(0)}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{bloqueado?.nombre_completo || 'Usuario'}</Text>
            <View style={styles.blockedBadgeRow}>
              <Ionicons name="ban" size={11} color={COLORS.danger} />
              <Text style={styles.blockedBadgeText}>Bloqueado por ti</Text>
            </View>
          </View>
        </TouchableOpacity>
        {/* Solo el bloqueador (yo) ve este botón */}
        <TouchableOpacity style={styles.unblockBtn} onPress={() => handleDesbloquear(item)}>
          <Ionicons name="lock-open-outline" size={14} color="#FFF" />
          <Text style={styles.unblockBtnText}>Desbloquear</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ─── LISTAS POR TAB ───────────────────────────────────────
  const renderContenidoTab = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }
    switch (tabActual) {
      case 0:
        return amigos.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="people-outline" size={52} color={COLORS.border} />
            <Text style={styles.emptyTitle}>Sin amigos aún</Text>
            <Text style={styles.emptySubText}>Busca compañeros por nombre o matrícula.</Text>
          </View>
        ) : (
          <FlatList
            data={amigos}
            keyExtractor={(i) => i.id.toString()}
            renderItem={renderAmigo}
            contentContainerStyle={{ paddingBottom: 16 }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        );
      case 1:
        return pendientes.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="mail-open-outline" size={52} color={COLORS.border} />
            <Text style={styles.emptyTitle}>Sin solicitudes</Text>
            <Text style={styles.emptySubText}>Cuando alguien te envíe una solicitud, aparecerá aquí.</Text>
          </View>
        ) : (
          <FlatList
            data={pendientes}
            keyExtractor={(i) => i.id.toString()}
            renderItem={renderPendiente}
            contentContainerStyle={{ paddingBottom: 16 }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        );
      case 2:
        return enviadas.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="paper-plane-outline" size={52} color={COLORS.border} />
            <Text style={styles.emptyTitle}>Sin solicitudes enviadas</Text>
          </View>
        ) : (
          <FlatList
            data={enviadas}
            keyExtractor={(i) => i.id.toString()}
            renderItem={renderEnviada}
            contentContainerStyle={{ paddingBottom: 16 }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        );
      case 3:
        return bloqueados.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="shield-checkmark-outline" size={52} color={COLORS.border} />
            <Text style={styles.emptyTitle}>Sin usuarios bloqueados</Text>
            <Text style={styles.emptySubText}>Los usuarios que bloquees aparecerán aquí. Solo tú puedes desbloquearlos.</Text>
          </View>
        ) : (
          <FlatList
            data={bloqueados}
            keyExtractor={(i) => i.id.toString()}
            renderItem={renderBloqueado}
            contentContainerStyle={{ paddingBottom: 16 }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopHeader title="Amigos" showBack onBackPress={() => navigation.goBack()} />

      {/* BÚSQUEDA */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o matrícula..."
            placeholderTextColor={COLORS.textSecondary}
            value={busqueda}
            onChangeText={setBusqueda}
            clearButtonMode="while-editing"
          />
          {buscando && <ActivityIndicator size="small" color={COLORS.primary} />}
        </View>
        {resultadosBusqueda.length > 0 && (
          <View style={styles.searchResults}>
            {resultadosBusqueda.map((u) => (
              <TouchableOpacity
                key={u.id}
                style={styles.searchResultItem}
                onPress={() => handleEnviarSolicitud(u)}
              >
                <View style={styles.searchResultAvatar}>
                  <Text style={styles.searchResultAvatarText}>{u.nombre_completo.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchResultName}>{u.nombre_completo}</Text>
                  <Text style={styles.searchResultSub}>⭐ {parseFloat(u.calificacion_pasajero || 5).toFixed(1)}</Text>
                </View>
                <View style={styles.addBtn}>
                  <Ionicons name="person-add" size={16} color={COLORS.primary} />
                  <Text style={styles.addBtnText}>Agregar</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {busqueda.length >= 2 && !buscando && resultadosBusqueda.length === 0 && (
          <View style={styles.noResultsRow}>
            <Text style={styles.noResultsText}>No se encontraron usuarios con ese nombre/matrícula.</Text>
          </View>
        )}
      </View>

      {/* TABS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map((tab, idx) => {
          const esBadgeSolicitudes = idx === 1 && pendientes.length > 0;
          const esBadgeBloqueados = idx === 3 && bloqueados.length > 0;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, tabActual === idx && styles.tabBtnActive]}
              onPress={() => setTabActual(idx)}
            >
              {idx === 3 && (
                <Ionicons
                  name="ban"
                  size={13}
                  color={tabActual === idx ? COLORS.danger : COLORS.textSecondary}
                  style={{ marginRight: 3 }}
                />
              )}
              <Text style={[styles.tabText, tabActual === idx && styles.tabTextActive]}>{tab}</Text>
              {(esBadgeSolicitudes || esBadgeBloqueados) && (
                <View style={[styles.tabBadge, idx === 3 && styles.tabBadgeDanger]}>
                  <Text style={styles.tabBadgeText}>{idx === 1 ? pendientes.length : bloqueados.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* CONTENIDO */}
      <View style={{ flex: 1 }}>
        {renderContenidoTab()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 72,
  },
  // BÚSQUEDA
  searchContainer: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SIZES.padding,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  searchResults: {
    marginTop: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchResultAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  searchResultAvatarText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  searchResultSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  noResultsRow: {
    paddingVertical: 8,
  },
  noResultsText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  // TABS — scrollable para acomodar el 4.o tab
  tabBar: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    maxHeight: 48,
  },
  tabBarContent: {
    flexDirection: 'row',
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeDanger: {
    backgroundColor: COLORS.danger,
  },
  tabBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  // USER CARDS
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
  },
  userInfoTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  userSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnSecondary: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelSolicitudBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelSolicitudText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  // BLOQUEADOS
  blockedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  blockedBadgeText: {
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '600',
  },
  unblockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#64748B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  unblockBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
