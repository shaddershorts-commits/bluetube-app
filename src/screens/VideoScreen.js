// Tela nativa de video unico — substitui o fallback que abria o navegador
// (Linking.openURL blue-video?v=) em Perfil, Salvos, Hashtag e Notificacoes.
// Recebe { video } pronto OU { video_id } (busca via blue-feed?video_id=).
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import VideoCard from '../components/VideoCard';
import blueAPI from '../api';
import { COLORS } from '../constants';
import { useT } from '../i18n';

export default function VideoScreen({ route, navigation }) {
  const { video: videoParam, video_id } = route.params || {};
  const [video, setVideo] = useState(videoParam && videoParam.video_url ? videoParam : null);
  const [loading, setLoading] = useState(!videoParam?.video_url);
  const [error, setError] = useState(false);
  const { height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const t = useT();

  useEffect(() => {
    if (video || !video_id && !videoParam?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const d = await blueAPI.videoById(video_id || videoParam.id);
        const v = d?.videos?.[0] || d?.video;
        if (!cancelled) {
          if (v && v.video_url) setVideo(v);
          else setError(true);
        }
      } catch (_) {
        if (!cancelled) setError(true);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <View style={styles.root}>
      {loading ? (
        <ActivityIndicator color={COLORS.neon} size="large" style={{ flex: 1 }} />
      ) : error || !video ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🎬</Text>
          <Text style={styles.emptyText}>{t('video_notfound')}</Text>
        </View>
      ) : (
        <VideoCard video={video} index={0} cardHeight={winH} activeOverride />
      )}
      <TouchableOpacity
        style={[styles.back, { top: insets.top + 8 }]}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="chevron-back" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14 },
  back: {
    position: 'absolute', left: 12, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
});
