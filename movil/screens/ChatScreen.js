import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../components/Theme';
import TopHeader from '../components/TopHeader';
import { useAuth } from '../src/context/AuthContext';
import { getMensajesChat, enviarMensaje, marcarChatLeido } from '../src/api/socialApi';

const POLLING_INTERVAL_MS = 4000;

export default function ChatScreen({ navigation, route }) {
  const { user } = useAuth();
  const {
    chatId,
    otroUsuarioId,
    otroUsuarioNombre = 'Usuario',
    viajeInfo = null,
  } = route.params || {};

  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const scrollRef = useRef(null);
  const pollingRef = useRef(null);
  const lastMsgIdRef = useRef(null);

  const cargarMensajes = useCallback(async (silencioso = false) => {
    if (!chatId) return;
    try {
      const data = await getMensajesChat(chatId, 0, 100);
      setMensajes(data);

      // Si hay mensajes nuevos, scroll al final
      const nuevoUltimo = data[data.length - 1];
      if (nuevoUltimo && nuevoUltimo.id !== lastMsgIdRef.current) {
        lastMsgIdRef.current = nuevoUltimo.id;
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        // Marcar como leídos
        await marcarChatLeido(chatId, user.id);
      }
    } catch (err) {
      if (!silencioso) {
        console.warn('[ChatScreen] Error al cargar mensajes:', err?.message);
      }
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, [chatId, user.id]);

  useEffect(() => {
    cargarMensajes(false);
    pollingRef.current = setInterval(() => cargarMensajes(true), POLLING_INTERVAL_MS);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [cargarMensajes]);

  const handleEnviar = async () => {
    const contenido = texto.trim();
    if (!contenido || enviando || !chatId || !otroUsuarioId) return;
    setEnviando(true);
    setTexto('');
    try {
      const nuevoMsg = await enviarMensaje(chatId, user.id, otroUsuarioId, contenido);
      setMensajes((prev) => [...prev, nuevoMsg]);
      lastMsgIdRef.current = nuevoMsg.id;
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (err) {
      Alert.alert('Error', 'No se pudo enviar el mensaje. Intenta de nuevo.');
      setTexto(contenido);
    } finally {
      setEnviando(false);
    }
  };

  const formatHora = (fechaStr) => {
    if (!fechaStr) return '';
    const d = new Date(fechaStr);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  const formatFechaGrupo = (fechaStr) => {
    if (!fechaStr) return '';
    const d = new Date(fechaStr);
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);
    if (d.toDateString() === hoy.toDateString()) return 'Hoy';
    if (d.toDateString() === ayer.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
  };

  // Agrupar mensajes por fecha
  const renderMensajes = () => {
    const grupos = [];
    let fechaActual = null;
    mensajes.forEach((msg, idx) => {
      const fechaMsg = new Date(msg.fecha_hora_registro).toDateString();
      if (fechaMsg !== fechaActual) {
        fechaActual = fechaMsg;
        grupos.push(
          <View key={`fecha-${idx}`} style={styles.dateGroupContainer}>
            <Text style={styles.dateLabel}>{formatFechaGrupo(msg.fecha_hora_registro)}</Text>
          </View>
        );
      }
      const esMio = msg.id_emisor === user.id;
      grupos.push(
        <View key={msg.id} style={[styles.msgRow, esMio ? styles.msgRowRight : styles.msgRowLeft]}>
          {!esMio && (
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarSmallText}>
                {otroUsuarioNombre.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={[styles.bubble, esMio ? styles.bubbleMio : styles.bubbleOtro]}>
            <Text style={[styles.bubbleText, esMio ? styles.bubbleTextMio : styles.bubbleTextOtro]}>
              {msg.contenido}
            </Text>
            <View style={styles.bubbleMeta}>
              <Text style={[styles.bubbleHora, esMio ? styles.bubbleHoraMio : styles.bubbleHoraOtro]}>
                {formatHora(msg.fecha_hora_registro)}
              </Text>
              {esMio && (
                <Ionicons
                  name={msg.leido ? 'checkmark-done' : 'checkmark'}
                  size={13}
                  color={msg.leido ? '#93C5FD' : 'rgba(255,255,255,0.6)'}
                  style={{ marginLeft: 3 }}
                />
              )}
            </View>
          </View>
        </View>
      );
    });
    return grupos;
  };

  if (!chatId) {
    return (
      <SafeAreaView style={styles.container}>
        <TopHeader title="Chat" showBack onBackPress={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>Chat no disponible</Text>
          <Text style={styles.emptySubText}>El chat se abre cuando el conductor acepta la solicitud.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{otroUsuarioNombre.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{otroUsuarioNombre}</Text>
          {viajeInfo && (
            <Text style={styles.headerSub} numberOfLines={1}>
              🚗 {viajeInfo.origen || 'Viaje'} → {viajeInfo.destino || ''}
            </Text>
          )}
        </View>
        <View style={styles.pollingDot} />
      </View>

      {/* MESSAGES */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando conversación...</Text>
          </View>
        ) : mensajes.length === 0 ? (
          <ScrollView contentContainerStyle={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={56} color={COLORS.border} />
            <Text style={styles.emptyText}>Sin mensajes aún</Text>
            <Text style={styles.emptySubText}>¡Sé el primero en enviar un mensaje!</Text>
          </ScrollView>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {renderMensajes()}
          </ScrollView>
        )}

        {/* INPUT */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={COLORS.textSecondary}
            value={texto}
            onChangeText={setTexto}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleEnviar}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!texto.trim() || enviando) && styles.sendBtnDisabled]}
            onPress={handleEnviar}
            disabled={!texto.trim() || enviando}
          >
            {enviando
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Ionicons name="send" size={19} color="#FFF" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  backBtn: {
    padding: 6,
    marginRight: 4,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerAvatarText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontWeight: '700',
    fontSize: 15,
    color: COLORS.text,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  pollingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginLeft: 8,
  },
  // MESSAGES
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,
  },
  dateGroupContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    backgroundColor: 'rgba(0,0,0,0.07)',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-end',
  },
  msgRowLeft: {
    justifyContent: 'flex-start',
  },
  msgRowRight: {
    justifyContent: 'flex-end',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginBottom: 2,
  },
  avatarSmallText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  bubbleMio: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOtro: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  bubbleTextMio: {
    color: '#FFFFFF',
  },
  bubbleTextOtro: {
    color: COLORS.text,
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  bubbleHora: {
    fontSize: 10,
  },
  bubbleHoraMio: {
    color: 'rgba(255,255,255,0.7)',
  },
  bubbleHoraOtro: {
    color: COLORS.textSecondary,
  },
  // INPUT BAR
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 110,
    marginRight: 10,
    lineHeight: 20,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  // STATES
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyContainer: {
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
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
});