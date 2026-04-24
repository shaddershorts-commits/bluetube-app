import { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import blueAPI from '../api';
import { useAuthStore } from '../store';
import { COLORS } from '../constants';

export default function ConversaScreen({ route }) {
  // Suporta 2 fluxos:
  // 1) Navegacao a partir da lista de conversas: { conversation_id, other }
  // 2) Navegacao a partir do PerfilUsuario "Enviar mensagem":
  //    { initNewChat: true, other } — conversation_id eh resolvido via open-conv
  const { conversation_id: paramConvId, other, initNewChat } = route.params || {};
  const [convId, setConvId] = useState(paramConvId || null);
  const [resolving, setResolving] = useState(initNewChat && !paramConvId);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const listRef = useRef(null);
  // myId pra renderizar bubbles do lado correto. Antes a logica estava invertida
  // (comparava com other.user_id em vez de comparar com o proprio sender).
  const myId = useAuthStore((s) => s.user?.id);

  // Resolve conv_id se vier de "Enviar mensagem" do perfil de outro user
  useEffect(() => {
    let cancelled = false;
    if (convId || !initNewChat || !other?.user_id) return;
    (async () => {
      try {
        const r = await blueAPI.abrirConversa(other.user_id);
        if (cancelled) return;
        if (r?.conv_id) setConvId(r.conv_id);
        else console.warn('[ConversaScreen] open-conv sem conv_id:', r);
      } catch (e) {
        console.error('[ConversaScreen] erro abrindo conversa:', e?.message || e);
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => { cancelled = true; };
  }, [convId, initNewChat, other?.user_id]);

  const load = async () => {
    if (!convId) return; // nao tenta carregar antes de resolver
    try {
      const d = await blueAPI.mensagens(convId);
      // Backend retorna { messages: [...] }. Fallback `mensagens` mantido pra
      // compatibilidade caso payload mude.
      setMensagens(d?.messages || d?.mensagens || []);
    } catch (e) {
      // NAO silenciar (regra do user). Log estruturado.
      console.error('[ConversaScreen] erro carregando mensagens:', e?.message || e);
    }
  };

  useEffect(() => {
    if (!convId) return;
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [convId]);

  const enviar = async () => {
    if (!texto.trim() || enviando || !other?.user_id) return;
    const msg = texto.trim();
    setTexto('');
    setEnviando(true);
    try {
      const r = await blueAPI.enviarMensagem(convId, msg, other.user_id);
      // Se a conversa nao existia (1a msg), o backend cria e retorna conv_id novo.
      // Atualiza o estado local pra os proximos polls saberem qual conv buscar.
      if (r?.conv_id && r.conv_id !== convId) setConvId(r.conv_id);
      load();
    } catch (e) {
      console.error('[ConversaScreen] erro enviando:', e?.message || e);
      // Restaura texto pra user nao perder o que digitou
      setTexto(msg);
    } finally {
      setEnviando(false);
    }
  };

  if (resolving) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <Header title={other?.display_name || other?.username || 'Conversa'} showBack />
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={COLORS.neon} />
          <Text style={styles.loadingText}>Abrindo conversa...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <Header title={other?.display_name || other?.username || 'Conversa'} showBack />
      <FlatList
        ref={listRef}
        data={mensagens}
        keyExtractor={(item, i) => String(item.id || i)}
        renderItem={({ item }) => {
          // FIX C4: comparar com proprio user_id (myId), nao com other.
          // Antes: mine = item.sender_id !== other?.user_id (invertia em casos
          // onde other.user_id era undefined ou em conversas de grupo futuras).
          const mine = item.sender_id === myId;
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.other]}>
              {/* FIX C3: backend retorna `text`, nao `content`/`mensagem`. */}
              <Text style={[styles.msg, mine && { color: '#fff' }]}>{item.text || ''}</Text>
            </View>
          );
        }}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />
      <View style={styles.inputBar}>
        <TextInput style={styles.input} placeholder="Mensagem…" placeholderTextColor={COLORS.textDim}
          value={texto} onChangeText={setTexto} multiline editable={!enviando} />
        <TouchableOpacity style={styles.send} onPress={enviar} disabled={enviando || !texto.trim()}>
          {enviando
            ? <ActivityIndicator color={COLORS.neon} size="small" />
            : <Ionicons name="send" color={texto.trim() ? COLORS.neon : COLORS.textDim} size={22} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  bubble: { maxWidth: '78%', padding: 10, borderRadius: 14, marginVertical: 3 },
  mine: { alignSelf: 'flex-end', backgroundColor: COLORS.primary },
  other: { alignSelf: 'flex-start', backgroundColor: COLORS.surface },
  msg: { color: COLORS.text, fontSize: 14 },
  inputBar: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.text, maxHeight: 100 },
  send: { padding: 10 },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.textSecondary, fontSize: 13 },
});
