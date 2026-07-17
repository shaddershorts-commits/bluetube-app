// Viewer de Stories estilo Instagram:
//   barras de progresso por story · avanco automatico (duracao) · tap direita
//   proximo / tap esquerda anterior · segurar pausa · arrastar pra baixo fecha
//   reacoes emoji + resposta por DM (stories de outros) · deletar (proprio)
// Backend: blue-stories (feed/ver/reagir/reply/deletar) — marca visto via ?action=ver.
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Animated,
  KeyboardAvoidingView, Platform, PanResponder, ActivityIndicator, Alert,
  Modal, Pressable, FlatList,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import Avatar from '../components/Avatar';
import blueAPI from '../api';
import { useAuthStore } from '../store';
import { COLORS_DARK as COLORS } from '../constants';
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

  // Vídeo do feed compartilhado no story/status: resolve dados pra renderizar
  const [shareVideo, setShareVideo] = useState(null);
  useEffect(() => {
    setShareVideo(null);
    if (story?.tipo === 'video_share' && story.video_id) {
      blueAPI.videoInfo(story.video_id)
        .then((d) => { if (d?.video) setShareVideo(d.video); })
        .catch(() => {});
    }
  }, [story?.id]);

  // Quem viu (só no MEU status): lista viewers + reações + respostas
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewersData, setViewersData] = useState(null); // null = carregando
  const abrirViewers = async () => {
    setViewersOpen(true);
    setPaused(true);
    setViewersData(null);
    const r = await blueAPI.storiesMeus().catch(() => null);
    const meu = (r?.stories || []).find((s) => s.id === story.id);
    setViewersData(meu || { viewers: [], reacoes: {}, replies: [], visualizacoes: 0 });
  };
  const fecharViewers = () => { setViewersOpen(false); setPaused(false); };

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
        ) : story.tipo === 'video_share' ? (
          <View style={styles.shareWrap}>
            {shareVideo?.thumbnail_url ? (
              <Image source={{ uri: shareVideo.thumbnail_url }} style={styles.shareThumb} resizeMode="cover" />
            ) : (
              <View style={[styles.shareThumb, styles.center]}><Text style={{ fontSize: 40 }}>🎬</Text></View>
            )}
            <Text style={styles.shareTitle} numberOfLines={2}>{shareVideo?.title || shareVideo?.titulo || 'Vídeo do Blue'}</Text>
            <Text style={styles.shareCreator}>@{shareVideo?.creator?.username || 'criador'} · Blue</Text>
            {shareVideo && (
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={() => navigation.navigate('Video', { videos: [shareVideo], startIndex: 0, mode: 'user', creator: shareVideo.creator })}>
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={styles.shareBtnText}>Assistir no Blue</Text>
              </TouchableOpacity>
            )}
          </View>
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

      {/* Rodape do MEU status: quem viu */}
      {isMine && (
        <TouchableOpacity style={[styles.viewersBtn, { bottom: insets.bottom + 18 }]} onPress={abrirViewers}>
          <Ionicons name="eye" size={16} color="#fff" />
          <Text style={styles.viewersBtnText}>Ver quem viu</Text>
        </TouchableOpacity>
      )}

      {/* Modal quem viu / curtiu / respondeu */}
      <Modal visible={viewersOpen} transparent animationType="slide" onRequestClose={fecharViewers}>
        <Pressable style={styles.vBackdrop} onPress={fecharViewers} />
        <View style={styles.vSheet}>
          <View style={styles.vHandle} />
          <Text style={styles.vTitle}>
            👁 {viewersData?.visualizacoes ?? '…'} visualizações
            {viewersData && viewersData.total_reacoes ? `  ·  ${Object.entries(viewersData.reacoes || {}).map(([e, n]) => `${e}${n}`).join(' ')}` : ''}
          </Text>
          {!viewersData ? (
            <ActivityIndicator color={COLORS.neon} style={{ marginVertical: 24 }} />
          ) : (
            <FlatList
              data={viewersData.viewers || []}
              keyExtractor={(v) => v.user_id}
              style={{ maxHeight: 340 }}
              ListEmptyComponent={<Text style={styles.vEmpty}>Ninguém viu ainda — seus contatos verão em breve. 👀</Text>}
              renderItem={({ item }) => (
                <View style={styles.vRow}>
                  <Avatar uri={item.avatar_url} initial={item.username} size={38} />
                  <Text style={styles.vName}>@{item.username}</Text>
                </View>
              )}
            />
          )}
          {viewersData?.replies?.length ? (
            <Text style={styles.vReplies}>💬 {viewersData.replies.length} resposta{viewersData.replies.length > 1 ? 's' : ''} — chegaram no seu BlueChat</Text>
          ) : null}
        </View>
      </Modal>

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
  // Vídeo compartilhado no story/status
  shareWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  shareThumb: { width: '82%', aspectRatio: 9 / 14, borderRadius: 18, backgroundColor: '#0a1628' },
  shareTitle: { color: '#fff', fontSize: 17, fontWeight: '800', textAlign: 'center', lineHeight: 23 },
  shareCreator: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 100, paddingHorizontal: 22, paddingVertical: 12, marginTop: 4 },
  shareBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  // Quem viu (meu status)
  viewersBtn: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 100, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  viewersBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  vBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  vSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#0a1020', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 34 },
  vHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 12 },
  vTitle: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 12 },
  vRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  vName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  vEmpty: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  vReplies: { color: COLORS.neon, fontSize: 12, fontWeight: '700', marginTop: 10, textAlign: 'center' },
});
