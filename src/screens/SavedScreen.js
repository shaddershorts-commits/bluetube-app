import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity,
  Image, useWindowDimensions, RefreshControl, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import blueAPI from '../api';
import { COLORS } from '../constants';

function formatCount(n) {
  if (!n || n < 1000) return String(n || 0);
  if (n < 1_000_000) return (n / 1000).toFixed(n >= 10_000 ? 0 : 1) + 'K';
  return (n / 1_000_000).toFixed(1) + 'M';
}

export default function SavedScreen() {
  const { width: W } = useWindowDimensions();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await blueAPI.meusSalvos();
      setVideos((d && d.videos) || []);
    } catch (e) {
      console.error('[SavedScreen] erro:', e?.message || e);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <Header title="Salvos" showBack />
        <View style={styles.center}><ActivityIndicator color={COLORS.neon} /></View>
      </View>
    );
  }

  const GAP = 3;
  const cardW = (W - GAP * 4) / 3;
  const cardH = cardW * (16 / 9);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header title="Salvos" showBack />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neon} />}
        contentContainerStyle={{ paddingBottom: 32 }}>
        {videos.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔖</Text>
            <Text style={styles.emptyText}>Nenhum vídeo salvo ainda</Text>
            <Text style={styles.emptyHint}>Toque no marcador no feed pra salvar vídeos pra ver depois</Text>
          </View>
        ) : (
          <View style={[styles.grid, { padding: GAP, gap: GAP }]}>
            {videos.map((v) => (
              <TouchableOpacity
                key={v.id}
                onPress={() => Linking.openURL(`https://bluetubeviral.com/blue-video?v=${v.id}`).catch(() => {})}
                activeOpacity={0.8}
                style={[styles.card, { width: cardW, height: cardH }]}>
                {v.thumbnail_url ? (
                  <Image source={{ uri: v.thumbnail_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <View style={[StyleSheet.absoluteFill, styles.fallback]}>
                    <Ionicons name="play" size={28} color="rgba(255,255,255,0.4)" />
                  </View>
                )}
                <View style={styles.viewsBadge}>
                  <Ionicons name="play" size={10} color="#fff" />
                  <Text style={styles.viewsText}>{formatCount(v.views || 0)}</Text>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { backgroundColor: '#0a0a0a', borderRadius: 6, overflow: 'hidden', position: 'relative' },
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  viewsBadge: {
    position: 'absolute', bottom: 6, left: 6,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  viewsText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 8, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  emptyHint: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
