import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import { useAuth } from '../src/context/AuthContext';
import { getChatsUsuario } from '../src/api/socialApi';

export default function ChatListScreen({ navigation }) {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargarChats = useCallback(async (esRefresh = false) => {
    if (!esRefresh) setLoading(true);
    try {
      const data = await getChatsUsuario(user.id);
      setChats(data);
    } catch (err) {
      console.warn('[ChatList] Error:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.id]);

  useEffect(() => {
    cargarChats();
    const intervalo = setInterval(() => cargarChats(true), 8000);
    return () => clearInterval(intervalo);
  }, [cargarChats]);

  const formatTiempo = (fechaStr) => {
    if (!fechaStr) return '';
    const d = new Date(fechaStr);
    const ahora = new Date();
    const diffMs = ahora - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  const renderChat = ({ item }) => {
    const otroUsuario = item.otro_usuario;
    const ultimoMsg = item.ultimo_mensaje;
    const noLeidos = item.mensajes_no_leidos || 0;
    const nombre = otroUsuario?.nombre_completo || 'Usuario';
    const inicial = nombre.charAt(0).toUpperCase();
    const esMioUltimo = ultimoMsg?.id_emisor === user.id;

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() =>
          navigation.navigate('Chat', {
            chatId: item.id,
            otroUsuarioId: otroUsuario?.id,
            otroUsuarioNombre: nombre,
            viajeInfo: item.id_viaje ? { viajeId: item.id_viaje } : null,
          })
        }
        activeOpacity={0.7}
      >
        {/* AVATAR */}
        <View style={[styles.avatar, noLeidos > 0 && styles.avatarActive]}>
          <Text style={styles.avatarText}>{inicial}</Text>
        </View>

        {/* CONTENIDO */}
        <View style={styles.chatContent}>
          <View style={styles.chatTopRow}>
            <Text style={[styles.chatName, noLeidos > 0 && styles.chatNameBold]} numberOfLines={1}>
              {nombre}
            </Text>
            <Text style={[styles.chatTime, noLeidos > 0 && styles.chatTimeBold]}>
              {formatTiempo(ultimoMsg?.fecha_hora_registro || item.fecha_hora_registro)}
            </Text>
          </View>
          <View style={styles.chatBottomRow}>
            <Text
              style={[styles.chatPreview, noLeidos > 0 && styles.chatPreviewBold]}
              numberOfLines={1}
            >
              {ultimoMsg
                ? `${esMioUltimo ? 'Tú: ' : ''}${ultimoMsg.contenido}`
                : 'Sin mensajes aún — toca para abrir el chat'}
            </Text>
            {noLeidos > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{noLeidos > 99 ? '99+' : noLeidos}</Text>
              </View>
            )}
          </View>
          {item.id_viaje && (
            <View style={styles.viajeChip}>
              <Ionicons name="car-outline" size={11} color={COLORS.primary} />
              <Text style={styles.viajeChipText}>Viaje #{item.id_viaje}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopHeader title="Mensajes" showBack onBackPress={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando conversaciones...</Text>
        </View>
      ) : chats.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyTitle}>Sin conversaciones</Text>
          <Text style={styles.emptySubText}>
            Los chats aparecen cuando un conductor acepta tu solicitud de viaje.
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderChat}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); cargarChats(true); }}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          contentContainerStyle={{ paddingVertical: 8 }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 20,
  },
  emptySubText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 76,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarActive: {
    backgroundColor: COLORS.primary,
  },
  avatarText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 20,
  },
  chatContent: {
    flex: 1,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  chatName: {
    fontSize: 15,
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  chatNameBold: {
    fontWeight: '700',
  },
  chatTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  chatTimeBold: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  chatBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatPreview: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  chatPreviewBold: {
    color: COLORS.text,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  viajeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 3,
  },
  viajeChipText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
