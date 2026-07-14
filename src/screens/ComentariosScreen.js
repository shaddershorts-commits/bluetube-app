// Comentários estilo Instagram: raízes ordenadas por curtidas, respostas
// aninhadas com "Ver N respostas" (expandir/recolher), curtir por comentário,
// responder (@usuário). Avatar do autor agora aparece (backend passa avatar_url).
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import blueAPI from '../api';
import { useAuthStore } from '../store';
import { requireAuth } from '../utils/requireAuth';
import { COLORS } from '../constants';

function ago(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return Math.floor(s / 60) + 'min';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  if (s < 604800) return Math.floor(s / 86400) + 'd';
  return Math.floor(s / 604800) + 'sem';
}

// Uma linha de comentário (raiz ou resposta)
function CommentRow({ item, onLike, onReply, isReply }) {
  const nav = useNavigation();
  const c = item.creator || {};
  const openProfile = () => item.user_id && nav.navigate('PerfilUsuario', { user_id: item.user_id });
  return (
    <View style={[styles.item, isReply && styles.itemReply]}>
      <TouchableOpacity onPress={openProfile}>
        <Avatar uri={c.avatar_url} initial={c.display_name || c.username} size={isReply ? 28 : 36} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <View style={styles.rowTop}>
          <TouchableOpacity onPress={openProfile}>
            <Text style={styles.user}>@{c.username || 'usuário'}{c.verificado ? ' ✔️' : ''}</Text>
          </TouchableOpacity>
          <Text style={styles.time}>· {ago(item.created_at)}</Text>
        </View>
        <Text style={styles.text}>{item.text}</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => onReply(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.replyBtn}>Responder</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.likeCol} onPress={() => onLike(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons
          name={item.liked_by_me ? 'heart' : 'heart-outline'}
          size={16}
          color={item.liked_by_me ? COLORS.red : COLORS.textSecondary}
        />
        {item.likes > 0 ? <Text style={styles.likeCount}>{item.likes}</Text> : null}
      </TouchableOpacity>
    </View>
  );
}

export default function ComentariosScreen({ route }) {
  const { video_id } = route.params;
  const nav = useNavigation();
  const user = useAuthStore((s) => s.user);
  const [comments, setComments] = useState([]); // flat, com creator
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState('');
  const [replyTo, setReplyTo] = useState(null); // comentário-raiz sendo respondido
  const [expanded, setExpanded] = useState({}); // { [parentId]: true }
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await blueAPI.comentarios(video_id);
      setComments(Array.isArray(d.comments) ? d.comments : []);
    } catch (_) {}
    setLoading(false);
  }, [video_id]);

  useEffect(() => { load(); }, [load]);

  // Threading: raízes (parent_id null) ordenadas por curtidas → recência;
  // respostas agrupadas por parent, mais antigas primeiro.
  const roots = comments
    .filter((c) => !c.parent_id)
    .sort((a, b) => (b.likes || 0) - (a.likes || 0) || new Date(b.created_at) - new Date(a.created_at));
  const repliesByParent = {};
  comments.filter((c) => c.parent_id).forEach((c) => {
    (repliesByParent[c.parent_id] = repliesByParent[c.parent_id] || []).push(c);
  });
  Object.values(repliesByParent).forEach((arr) => arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));

  // Lista achatada pra FlatList: cada raiz + (se expandida) suas respostas
  const rows = [];
  roots.forEach((root) => {
    rows.push({ type: 'root', item: root });
    const reps = repliesByParent[root.id] || [];
    if (reps.length) {
      if (expanded[root.id]) {
        reps.forEach((r) => rows.push({ type: 'reply', item: r }));
        rows.push({ type: 'collapse', parentId: root.id });
      } else {
        rows.push({ type: 'expand', parentId: root.id, count: reps.length });
      }
    }
  });

  const handleLike = async (item) => {
    if (!requireAuth(nav, 'curtir')) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // otimista
    setComments((prev) => prev.map((c) => c.id === item.id
      ? { ...c, liked_by_me: !c.liked_by_me, likes: Math.max(0, (c.likes || 0) + (c.liked_by_me ? -1 : 1)) }
      : c));
    const r = await blueAPI.curtirComentario(item.id).catch(() => null);
    if (r && typeof r.likes === 'number') {
      setComments((prev) => prev.map((c) => c.id === item.id ? { ...c, liked_by_me: r.liked, likes: r.likes } : c));
    }
  };

  const handleReply = (item) => {
    if (!requireAuth(nav, 'comentar')) return;
    // responde sempre na raiz (thread de 1 nível, estilo Instagram)
    const root = item.parent_id ? comments.find((c) => c.id === item.parent_id) || item : item;
    setReplyTo({ id: root.id, username: (item.creator || {}).username || 'usuário' });
    setExpanded((e) => ({ ...e, [root.id]: true }));
  };

  const enviar = async () => {
    const t = texto.trim();
    if (!t || sending) return;
    if (!requireAuth(nav, 'comentar')) return;
    setSending(true);
    const r = await blueAPI.comentar(video_id, t, replyTo?.id).catch((e) => ({ error: e.message }));
    setSending(false);
    if (r?.error) { Alert.alert('Não foi possível comentar', r.error); return; }
    setTexto('');
    setReplyTo(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    load();
  };

  const renderRow = ({ item: row }) => {
    if (row.type === 'root' || row.type === 'reply') {
      return <CommentRow item={row.item} onLike={handleLike} onReply={handleReply} isReply={row.type === 'reply'} />;
    }
    if (row.type === 'expand') {
      return (
        <TouchableOpacity style={styles.threadToggle} onPress={() => setExpanded((e) => ({ ...e, [row.parentId]: true }))}>
          <View style={styles.threadLine} />
          <Text style={styles.threadText}>Ver {row.count} {row.count === 1 ? 'resposta' : 'respostas'}</Text>
        </TouchableOpacity>
      );
    }
    // collapse
    return (
      <TouchableOpacity style={styles.threadToggle} onPress={() => setExpanded((e) => ({ ...e, [row.parentId]: false }))}>
        <View style={styles.threadLine} />
        <Text style={styles.threadText}>Ocultar respostas</Text>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header title="Comentários" showBack />
      {loading ? (
        <ActivityIndicator color={COLORS.neon} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row, i) => (row.item?.id || row.parentId || 'r') + '_' + row.type + '_' + i}
          renderItem={renderRow}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum comentário ainda. Seja o primeiro!</Text>}
          contentContainerStyle={{ paddingBottom: 12 }}
          keyboardShouldPersistTaps="handled"
        />
      )}
      {replyTo ? (
        <View style={styles.replyBanner}>
          <Text style={styles.replyBannerText}>Respondendo @{replyTo.username}</Text>
          <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder={replyTo ? `Responder @${replyTo.username}…` : 'Adicionar comentário…'}
          placeholderTextColor={COLORS.textDim}
          value={texto}
          onChangeText={setTexto}
          multiline
          onSubmitEditing={enviar}
        />
        <TouchableOpacity style={styles.send} onPress={enviar} disabled={sending || !texto.trim()}>
          {sending
            ? <ActivityIndicator color={COLORS.neon} size="small" />
            : <Ionicons name="send" color={texto.trim() ? COLORS.neon : COLORS.textDim} size={22} />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 10, alignItems: 'flex-start' },
  itemReply: { paddingLeft: 40, backgroundColor: 'rgba(255,255,255,0.015)' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  user: { color: COLORS.neon, fontSize: 12, fontWeight: '700' },
  time: { color: COLORS.textDim, fontSize: 11 },
  text: { color: COLORS.text, fontSize: 13, lineHeight: 18, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 5 },
  replyBtn: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  likeCol: { alignItems: 'center', paddingTop: 2, minWidth: 26 },
  likeCount: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
  threadToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 46, paddingVertical: 6 },
  threadLine: { width: 22, height: 1, backgroundColor: COLORS.border },
  threadText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  empty: { color: COLORS.textSecondary, textAlign: 'center', padding: 40, fontSize: 13 },
  replyBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 6, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  replyBannerText: { color: COLORS.textSecondary, fontSize: 12 },
  inputBar: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: COLORS.border, alignItems: 'flex-end' },
  input: { flex: 1, maxHeight: 100, backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.text },
  send: { padding: 10 },
});
