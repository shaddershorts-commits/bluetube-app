import { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, Share, Animated, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useFeedStore, useAuthStore } from '../store';
import { COLORS } from '../constants';
import Avatar from './Avatar';
import ActionButton from './ActionButton';
import blueAPI from '../api';

const DOUBLE_TAP_MS = 260;

// Dedup de views por sessao do app: rolar pra cima/baixo re-ativava o card e
// disparava interact('view') de novo — inflava o contador. 1 view por video
// por sessao (mesmo criterio do site).
const _viewedThisSession = new Set();
const SESSION_ID = 'app-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// Decide resizeMode baseado no aspect ratio (w/h):
//   < 0.85 => portrait/vertical -> COVER (preenche a tela, como TikTok)
//   >= 0.85 => square ou landscape -> CONTAIN (letterbox, nao corta)
function pickResizeMode(w, h) {
  if (!w || !h) return ResizeMode.COVER;
  const aspect = w / h;
  return aspect < 0.85 ? ResizeMode.COVER : ResizeMode.CONTAIN;
}

export default function VideoCard({ video, index, cardHeight, activeOverride }) {
  const currentIndex = useFeedStore((s) => s.currentIndex);
  const appActive = useFeedStore((s) => s.appActive);
  const user = useAuthStore((s) => s.user);
  // isFocused: pausa o video quando o user troca de aba (Descobrir/Chat/Perfil)
  // e retoma ao voltar — antes continuava tocando em segundo plano.
  const isFocused = useIsFocused();
  const isActive = (activeOverride === true || currentIndex === index) && isFocused && appActive !== false;
  const videoRef = useRef(null);
  const nav = useNavigation();
  const { width: W } = useWindowDimensions();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(video.likes || 0);
  const [muted, setMuted] = useState(false);
  const [fitMode, setFitMode] = useState(() => pickResizeMode(video.width, video.height));

  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef(0);

  // Autoplay robusto em mobile: se o device bloquear play com audio
  // (algumas versoes de Android/iOS em low-power ou com some restricoes
  // de media session), retenta mutado. Mesma cascata do web:
  // fix(blue): autoplay mobile robusto — play -> muted -> canplay
  useEffect(() => {
    if (!videoRef.current) return;
    let cancelled = false;
    const sendView = () => {
      if (_viewedThisSession.has(video.id)) return;
      _viewedThisSession.add(video.id);
      blueAPI.interact('view', video.id, { user_id: user?.id, session_id: SESSION_ID }).catch(() => {});
    };
    if (isActive) {
      (async () => {
        try {
          await videoRef.current.playAsync();
          if (!cancelled) sendView();
        } catch (e) {
          // Fallback: muta e tenta de novo
          try {
            await videoRef.current.setIsMutedAsync(true);
            if (!cancelled) setMuted(true);
            await videoRef.current.playAsync();
            if (!cancelled) sendView();
          } catch (_) {}
        }
      })();
    } else {
      videoRef.current.pauseAsync().catch(() => {});
    }
    return () => { cancelled = true; };
  }, [isActive]);

  // Quando o expo-av carrega o video, ele da a dimensao real via naturalSize.
  // Usamos isso pra corrigir fit quando metadata do banco estiver faltando/errada.
  const handleVideoLoad = (status) => {
    const ns = status?.naturalSize;
    if (ns && ns.width && ns.height) {
      setFitMode(pickResizeMode(ns.width, ns.height));
    }
  };

  const flashHeart = () => {
    heartScale.setValue(0);
    heartOpacity.setValue(1);
    Animated.parallel([
      Animated.sequence([
        Animated.spring(heartScale, { toValue: 1.3, tension: 120, friction: 6, useNativeDriver: true }),
        Animated.timing(heartScale, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(heartOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  };

  const handleLike = async (fromDoubleTap = false) => {
    const wasLiked = liked;
    const nowLiked = !wasLiked;
    if (fromDoubleTap && wasLiked) return;
    setLiked(nowLiked);
    setLikes((l) => l + (wasLiked ? -1 : 1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (nowLiked) flashHeart();
    await blueAPI.interact(wasLiked ? 'unlike' : 'like', video.id).catch(() => {});
  };

  const handleSave = async () => {
    const nowSaved = !saved;
    setSaved(nowSaved);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await blueAPI.salvar(video.id).catch(() => {});
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await Share.share({
        message: `${video.title || 'Vídeo no Blue'} — https://bluetubeviral.com/blue-video.html?v=${video.id}`,
      });
    } catch {}
  };

  const handleVideoPress = () => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      handleLike(true);
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (Date.now() - lastTapRef.current >= DOUBLE_TAP_MS) {
          setMuted((m) => !m);
        }
      }, DOUBLE_TAP_MS);
    }
  };

  const creator = video.creator || {};
  const containerStyle = [styles.container, { width: W, height: cardHeight }];
  // Card agora ocupa a tela inteira (video atras da pill flutuante estilo
  // Instagram). uiBottom afasta legendas/acoes da pill; na tela de video
  // unico (activeOverride) nao ha tab bar, offset menor.
  const insets = useSafeAreaInsets();
  const uiBottom = insets.bottom + (activeOverride ? 28 : 100);

  return (
    <View style={containerStyle}>
      <Pressable onPress={handleVideoPress} style={StyleSheet.absoluteFill}>
        <Video
          ref={videoRef}
          source={{ uri: video.video_url }}
          style={StyleSheet.absoluteFill}
          resizeMode={fitMode}
          isLooping
          shouldPlay={isActive}
          isMuted={muted}
          onLoad={handleVideoLoad}
        />
      </Pressable>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.gradient}
        pointerEvents="none"
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.heartBurst,
          { opacity: heartOpacity, transform: [{ scale: heartScale }] },
        ]}
      >
        <Ionicons name="heart" size={140} color="#ff3366" />
      </Animated.View>

      <View style={[styles.info, { bottom: uiBottom }]}>
        <TouchableOpacity onPress={() => nav.navigate('PerfilUsuario', { user_id: video.user_id })}>
          <Text style={styles.username}>@{creator.username || 'blue'}</Text>
        </TouchableOpacity>
        {video.title ? <Text style={styles.title} numberOfLines={2}>{video.title}</Text> : null}
      </View>

      <View style={[styles.actions, { bottom: uiBottom + 44 }]}>
        <TouchableOpacity onPress={() => nav.navigate('PerfilUsuario', { user_id: video.user_id })}>
          <Avatar uri={creator.avatar_url} initial={creator.display_name || creator.username} size={48} />
        </TouchableOpacity>
        <ActionButton icon={liked ? 'heart' : 'heart-outline'} count={likes} onPress={() => handleLike(false)} active={liked} color={COLORS.red} />
        <ActionButton icon="chatbubble-outline" count={video.comments} onPress={() => nav.navigate('Comentarios', { video_id: video.id })} />
        <ActionButton icon={saved ? 'bookmark' : 'bookmark-outline'} count={video.saves} onPress={handleSave} active={saved} color={COLORS.neon} />
        <ActionButton icon="paper-plane-outline" onPress={handleShare} />
      </View>

      {muted && (
        <View style={styles.mutedIndicator}>
          <Text style={styles.mutedText}>🔇</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#000' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 300 },
  info: { position: 'absolute', bottom: 30, left: 16, right: 90 },
  username: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 8 },
  title: { color: '#fff', fontSize: 13, lineHeight: 18 },
  actions: { position: 'absolute', right: 10, bottom: 80, alignItems: 'center' },
  mutedIndicator: { position: 'absolute', top: '50%', alignSelf: 'center', backgroundColor: 'rgba(0,0,0,.5)', padding: 14, borderRadius: 50 },
  mutedText: { fontSize: 28 },
  heartBurst: { position: 'absolute', top: '50%', left: '50%', marginLeft: -70, marginTop: -70 },
});
