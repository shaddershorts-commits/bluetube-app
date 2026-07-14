// Viewer de Stories estilo Instagram:
//   barras de progresso por story · avanco automatico (duracao) · tap direita
//   proximo / tap esquerda anterior · segurar pausa · arrastar pra baixo fecha
//   reacoes emoji + resposta por DM (stories de outros) · deletar (proprio)
// Backend: blue-stories (feed/ver/reagir/reply/deletar) — marca visto via ?action=ver.
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Animated,
  KeyboardAvoidingView, Platform, PanResponder, ActivityIndicator, Alert,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import Avatar from '../components/Avatar';
import blueAPI from '../api';
import { useAuthStore } from '../store';
import { COLORS } from '../constants';
import { useT } from '../i18n';

const EMOJIS = ['❤️', '🔥', '😂', '😮', '😢', '👏', '🤯'];

export default function StoryViewerScreen({ route, navigation }) {
  const { users: usersParam, startUserIndex = 0, user_id } = route.params || {};
  const me = useAuthStore((s) => s.user);
  const t = useT();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState(Array.isArray(usersParam) ? usersParam : []);
  const [userIdx, setUserIdx] = useState(startUserIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(!usersParam);
  const progress = useRef(new Animated.Value(0)).current;
  const animRef = useRef(null);
  const seenRef = useRef(new Set());

  // Aberto por user_id (anel no avatar do feed): busca o feed e localiza o grupo
  useEffect(() => {
    if (usersParam || !user_id) return;
    let cancelled = false;
    (async () => {
      try {
        const d = await blueAPI.storiesFeed();
        const gs = d?.users || [];
        if (cancelled) return;
        const idx = gs.findIndex((g) => g.user_id === user_id);
        if (idx >= 0) { setUsers(gs); setUserIdx(idx); }
      } catch (_) {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const group = users[userIdx];
  const story = group?.stories?.[storyIdx];
  const isMine = group?.user_id && me?.id && group.user_id === me.id;

  const goNext = useCallback(() => {
    if (!group) return navigation.goBack();
    if (storyIdx < group.stories.length - 1) setStoryIdx(storyIdx + 1);
    else if (userIdx < users.length - 1) { setUserIdx(userIdx + 1); setStoryIdx(0); }
    else navigation.goBack();
  }, [group, storyIdx, userIdx, users.length]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) setStoryIdx(storyIdx - 1);
    else if (userIdx > 0) {
      const prevGroup = users[userIdx - 1];
      setUserIdx(userIdx - 1);
      setStoryIdx(Math.max(0, (prevGroup?.stories?.length || 1) - 1));
    }
  }, [storyIdx, userIdx, users]);

  // Timer de avanco + marca visto
  useEffect(() => {
    if (!story) return;
    if (!seenRef.current.has(story.id)) {
      seenRef.current.add(story.id);
      blueAPI.storyVer(story.id).catch(() => {});
    }
    progress.setValue(0);
    if (paused) return;
    const dur = Math.max(2, Math.min(15, story.duracao || (story.tipo === 'video' ? 15 : 5))) * 1000;
    animRef.current = Animated.timing(progress, { toValue: 1, duration: dur, useNativeDriver: false });
    animRef.current.start(({ finished }) => { if (finished) goNext(); });
    return () => { animRef.current?.stop(); };
  }, [story?.id, paused, goNext]);

  // Swipe pra baixo fecha (estilo IG)
  const closePan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 70 && Math.abs(g.dx) < 80,
    onPanResponderGrant: () => navigation.goBack(),
  })).current;

  const handleReact = async (emoji) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Toast.show({ type: 'success', text1: emoji, visibilityTime: 900 });
    await blueAPI.storyReagir(story.id, emoji).catch(() => {});
  };

  const handleReply = async () => {
    const texto = reply.trim();
    if (!texto) return;
    setReply('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const r = await blueAPI.storyReply(story.id, texto).catch(() => null);
    Toast.show({ type: r?.ok || r?.message ? 'success' : 'error', text1: r?.ok || r?.message ? '✓ Enviado' : 'Falhou, tenta de novo', visibilityTime: 1200 });
  };

  const handleDelete = () => {
    Alert.alert(t('st_delete_story'), t('st_sure'), [
      { text: t('st_cancel'), style: 'cancel' },
      {
        text: t('st_delete_story'), style: 'destructive',
        onPress: async () => {
          await blueAPI.storyDeletar(story.id).catch(() => {});
          navigation.goBack();
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.root}><ActivityIndicator color={COLORS.neon} style={{ flex: 1 }} /></View>;
  }
  if (!group || !story) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={{ color: COLORS.textSecondary }}>{t('story_none')}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: COLORS.neon }}>{t('st_cancel')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root} {...closePan.panHandlers}>
      {/* Midia */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: story.cor_fundo || '#020817' }]}>
        {story.tipo === 'video' && story.media_url ? (
          <Video
            source={{ uri: story.media_url }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            shouldPlay={!paused}
            isLooping={false}
          />
        ) : story.media_url ? (
          <Image source={{ uri: story.media_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={styles.textStoryWrap}>
            <Text style={styles.textStory}>{story.texto}</Text>
          </View>
        )}
      </View>

      {/* Zonas de toque: esquerda volta, direita avanca, segurar pausa */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1}
            onPress={goPrev} onLongPress={() => setPaused(true)} onPressOut={() => paused && setPaused(false)} delayLongPress={200} />
          <TouchableOpacity style={{ flex: 2 }} activeOpacity={1}
            onPress={goNext} onLongPress={() => setPaused(true)} onPressOut={() => paused && setPaused(false)} delayLongPress={200} />
        </View>
      </View>

      {/* Barras de progresso */}
      <View style={[styles.barsRow, { top: insets.top + 8 }]} pointerEvents="none">
        {group.stories.map((s, i) => (
          <View key={s.id || i} style={styles.barBg}>
            <Animated.View
              style={[styles.barFill, {
                width: i < storyIdx ? '100%' : i === storyIdx
                  ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                  : '0%',
              }]}
            />
          </View>
        ))}
      </View>

      {/* Header: avatar, nome, fechar/deletar */}
      <View style={[styles.header, { top: insets.top + 20 }]}>
        <Avatar uri={group.avatar_url} initial={group.display_name || group.username} size={34} />
        <Text style={styles.headerName}>@{group.username}</Text>
        <View style={{ flex: 1 }} />
        {isMine && (
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="trash-outline" size={22} color="#fff" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: 16 }}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Rodape: reacoes + reply (stories dos outros) */}
      {!isMine && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.emojiRow}>
            {EMOJIS.map((e) => (
              <TouchableOpacity key={e} onPress={() => handleReact(e)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                <Text style={styles.emoji}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.replyRow}>
            <TextInput
              style={styles.replyInput}
              placeholder={t('story_reply')}
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={reply}
              onChangeText={setReply}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              onSubmitEditing={handleReply}
              returnKeyType="send"
            />
            <TouchableOpacity onPress={handleReply} style={styles.sendBtn}>
              <Ionicons name="paper-plane" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  textStoryWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  textStory: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center', lineHeight: 36 },
  barsRow: { position: 'absolute', left: 8, right: 8, flexDirection: 'row', gap: 4 },
  barBg: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  header: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  emoji: { fontSize: 30 },
  replyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  replyInput: {
    flex: 1, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    color: '#fff', paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.neon,
    alignItems: 'center', justifyContent: 'center',
  },
});
