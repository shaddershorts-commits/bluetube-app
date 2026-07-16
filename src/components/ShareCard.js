// ShareCard — vídeo do Blue compartilhado no chat. Mostra thumb + título;
// toque abre o vídeo (a view conta pro criador via fluxo normal do player).
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import blueAPI from '../api';
import { COLORS } from '../constants';

const cache = {}; // videoId -> video (evita refetch a cada render)

export default function ShareCard({ videoId }) {
  const nav = useNavigation();
  const [video, setVideo] = useState(cache[videoId] || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (video || !videoId) return;
    let on = true;
    blueAPI.videoInfo(videoId)
      .then((d) => { if (on && d?.video) { cache[videoId] = d.video; setVideo(d.video); } else if (on) setFailed(true); })
      .catch(() => on && setFailed(true));
    return () => { on = false; };
  }, [videoId]);

  if (failed) {
    return (
      <View style={[styles.card, styles.center]}>
        <Text style={styles.gone}>🎬 Vídeo indisponível</Text>
      </View>
    );
  }
  if (!video) {
    return <View style={[styles.card, styles.center]}><ActivityIndicator color={COLORS.neon} size="small" /></View>;
  }
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => nav.navigate('Video', { videos: [video], startIndex: 0, mode: 'user', creator: video.creator })}
    >
      {video.thumbnail_url
        ? <Image source={{ uri: video.thumbnail_url }} style={styles.thumb} resizeMode="cover" />
        : <View style={[styles.thumb, styles.center]}><Ionicons name="videocam" size={30} color={COLORS.textDim} /></View>}
      <View style={styles.playBadge}><Ionicons name="play" size={18} color="#fff" /></View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{video.title || 'Vídeo no Blue'}</Text>
        <Text style={styles.creator} numberOfLines={1}>@{video.creator?.username || 'criador'} · Blue</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { width: 220, borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)' },
  thumb: { width: '100%', height: 260, backgroundColor: 'rgba(0,0,0,0.3)' },
  playBadge: { position: 'absolute', top: 110, alignSelf: 'center', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  info: { padding: 10 },
  title: { color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 17 },
  creator: { color: COLORS.textDim, fontSize: 11, marginTop: 3 },
  center: { alignItems: 'center', justifyContent: 'center', minHeight: 80 },
  gone: { color: COLORS.textDim, fontSize: 12.5, padding: 12 },
});
