import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl,
  Image, TouchableOpacity, useWindowDimensions, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import Header from '../components/Header';
import blueAPI from '../api';
import { COLORS } from '../constants';

function formatCount(n) {
  if (!n || n < 1000) return String(n || 0);
  if (n < 1_000_000) return (n / 1000).toFixed(n >= 10_000 ? 0 : 1) + 'K';
  return (n / 1_000_000).toFixed(1) + 'M';
}

export default function HashtagScreen() {
  const route = useRoute();
  const { width: W } = useWindowDimensions();
  const tag = decodeURIComponent(route.params?.tag || '');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!tag) return;
    try {
      const d = await blueAPI.hashtagFeed(tag);
      setVideos(d?.videos || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [tag]);

  useEffect(() => { load(); }, [load]);

  const GAP = 3;
  const cardW = (W - GAP * 4) / 3;
  const cardH = cardW * (16 / 9);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header title={`#${tag}`} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.neon} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={COLORS.neon}
            />
          }>
          <View style={styles.hero}>
            <Text style={styles.heroTag}>#{tag}</Text>
            <Text style={styles.heroCount}>{videos.length} {videos.length === 1 ? 'vídeo' : 'vídeos'}</Text>
          </View>
          <View style={[styles.grid, { padding: GAP, gap: GAP }]}>
            {videos.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🎬</Text>
                <Text style={styles.emptyText}>Nenhum vídeo com essa hashtag ainda</Text>
              </View>
            ) : (
              videos.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.gridCard, { width: cardW, height: cardH }]}
                  activeOpacity={0.85}
                  onPress={() => Linking.openURL(`https://bluetubeviral.com/blue-video?v=${v.id}`).catch(() => {})}>
                  {v.thumbnail_url ? (
                    <Image source={{ uri: v.thumbnail_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : (
                    <View style={[StyleSheet.absoluteFill, styles.gridFallback]}>
                      <Ionicons name="play" size={24} color="rgba(255,255,255,0.4)" />
                    </View>
                  )}
                  <View style={styles.gridViewsBadge}>
                    <Ionicons name="play" size={10} color="#fff" />
                    <Text style={styles.gridViewsText}>{formatCount(v.views || 0)}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 32 },
  hero: { padding: 22, alignItems: 'center', gap: 4 },
  heroTag: { color: COLORS.neon, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  heroCount: { color: COLORS.textSecondary, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCard: { backgroundColor: '#0a0a0a', borderRadius: 6, overflow: 'hidden', position: 'relative' },
  gridFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  gridViewsBadge: {
    position: 'absolute', bottom: 6, left: 6,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  gridViewsText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  empty: { width: '100%', alignItems: 'center', paddingVertical: 50, gap: 8 },
  emptyIcon: { fontSize: 38 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14 },
});
