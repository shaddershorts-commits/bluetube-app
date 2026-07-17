// Sua atividade — todos os posts que o usuário CURTIU (Configurações).
// Mesmo padrão visual do Salvos: grade 3 colunas → toque abre o player.
// Backend: blue-profile?action=my-likes (blue_likes → blue_videos ativos).
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity,
  Image, useWindowDimensions, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import blueAPI from '../api';
import { COLORS } from '../constants';

function formatCount(n) {
  if (!n || n < 1000) return String(n || 0);
  if (n < 1_000_000) return (n / 1000).toFixed(n >= 10_000 ? 0 : 1) + 'K';
  return (n / 1_000_000).toFixed(1) + 'M';
}

export default function AtividadeScreen() {
  const nav = useNavigation();
  const { width: W } = useWindowDimensions();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await blueAPI.minhasCurtidas();
      setVideos((d && d.videos) || []);
    } catch (e) { /* fica vazio */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <Header title="Sua atividade" showBack />
        <View style={styles.center}><ActivityIndicator color={COLORS.neon} /></View>
      </View>
    );
  }

  const GAP = 3;
  const cardW = (W - GAP * 4) / 3;
  const cardH = cardW * (16 / 9);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header title="Sua atividade" showBack />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neon} />}
        contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={styles.sub}>❤️ Posts que você curtiu ({videos.length})</Text>
        {videos.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🤍</Text>
            <Text style={styles.emptyText}>Nenhuma curtida ainda</Text>
            <Text style={styles.emptyHint}>Os vídeos que você curtir no feed aparecem aqui</Text>
          </View>
        ) : (
          <View style={[styles.grid, { padding: GAP, gap: GAP }]}>
            {videos.map((v) => (
              <TouchableOpacity
                key={v.id}
                onPress={() => nav.navigate('Video', { videos, startIndex: videos.indexOf(v), mode: 'list' })}
                activeOpacity={0.8}
                style={[styles.card, { width: cardW, height: cardH }]}>
                {v.thumbnail_url ? (
                  <Image source={{ uri: v.thumbnail_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <View style={[StyleSheet.absoluteFill, styles.fallback]}>
                    <Ionicons name="play" size={28} color="rgba(255,255,255,0.4)" />
                  </View>
                )}
                <View style={styles.likeBadge}>
                  <Ionicons name="heart" size={10} color="#fff" />
                  <Text style={styles.likeText}>{formatCount(v.likes || 0)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sub: { color: COLORS.textSecondary, fontSize: 12, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { borderRadius: 8, overflow: 'hidden', backgroundColor: COLORS.surface },
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  likeBadge: { position: 'absolute', left: 6, bottom: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  likeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 44 },
  emptyText: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  emptyHint: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
