import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, Image, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import blueAPI from '../api';
import { COLORS } from '../constants';
import { colors as theme, radius, space } from '../constants/theme';

function formatCount(n) {
  if (!n || n < 1000) return String(n || 0);
  if (n < 1_000_000) return (n / 1000).toFixed(n >= 10_000 ? 0 : 1) + 'K';
  return (n / 1_000_000).toFixed(1) + 'M';
}

function StatCard({ icon, label, value, color }) {
  return (
    <GlassCard style={styles.cardWrap} padded={false}>
      <View style={styles.cardInner}>
        <View style={[styles.cardIcon, { backgroundColor: color + '22' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.cardValue}>{value}</Text>
        <Text style={styles.cardLabel}>{label}</Text>
      </View>
    </GlassCard>
  );
}

export default function AnalyticsScreen() {
  const [stats, setStats] = useState(null);
  const [topVideos, setTopVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await blueAPI.analytics();
      setStats(d?.stats || null);
      // Top 5 vídeos por views (backend ja retorna ordenado views.desc)
      setTopVideos((d?.videos || []).slice(0, 5));
    } catch (e) {
      console.error('[AnalyticsScreen] erro:', e?.message || e);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <Header title="Analytics" showBack />
        <View style={styles.center}><ActivityIndicator color={COLORS.neon} /></View>
      </View>
    );
  }

  const s = stats || {};
  const completionPct = Math.round(s.avg_completion || 0);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header title="Analytics" showBack />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neon} />}
        contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Cards principais */}
        <View style={styles.cardsRow}>
          <StatCard icon="eye-outline"       color="#3b82f6" label="Views totais"   value={formatCount(s.total_views || 0)} />
          <StatCard icon="heart-outline"     color="#ef4444" label="Curtidas"       value={formatCount(s.total_likes || 0)} />
        </View>
        <View style={styles.cardsRow}>
          <StatCard icon="bookmark-outline"  color="#f59e0b" label="Saves"          value={formatCount(s.total_saves || 0)} />
          <StatCard icon="chatbubble-outline" color="#10b981" label="Comentários"   value={formatCount(s.total_comments || 0)} />
        </View>
        <View style={styles.cardsRow}>
          <StatCard icon="film-outline"      color={COLORS.neon} label="Vídeos publicados" value={formatCount(s.video_count || 0)} />
          <StatCard icon="speedometer-outline" color="#8b5cf6" label="Taxa de retenção" value={completionPct + '%'} />
        </View>

        {/* Top 5 videos */}
        {topVideos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔥 Top 5 vídeos</Text>
            {topVideos.map((v, i) => (
              <View key={v.id} style={styles.topRow}>
                <Text style={styles.topRank}>#{i + 1}</Text>
                {v.thumbnail_url ? (
                  <Image source={{ uri: v.thumbnail_url }} style={styles.topThumb} />
                ) : (
                  <View style={[styles.topThumb, styles.topThumbFallback]}>
                    <Ionicons name="play" size={14} color="rgba(255,255,255,0.4)" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.topTitle} numberOfLines={2}>{v.title || 'Sem título'}</Text>
                  <View style={styles.topStats}>
                    <Text style={styles.topStat}><Ionicons name="eye" size={11} /> {formatCount(v.views || 0)}</Text>
                    <Text style={styles.topStat}><Ionicons name="heart" size={11} /> {formatCount(v.likes || 0)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Link pra analytics completa no site */}
        <View style={styles.linkBox}>
          <Text style={styles.linkText}>Análise completa, gráficos e exportação:</Text>
          <Text
            style={styles.linkUrl}
            onPress={() => Linking.openURL('https://bluetubeviral.com/blue-analytics').catch(() => {})}>
            bluetubeviral.com/blue-analytics →
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardsRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 10, marginTop: 12 },
  cardWrap: { flex: 1 },
  cardInner: { padding: 16, alignItems: 'flex-start' },
  cardIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardValue: { color: COLORS.text, fontSize: 22, fontWeight: '800' },
  cardLabel: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  section: { paddingHorizontal: 16, paddingTop: 24 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  topRank: { color: COLORS.neon, fontSize: 14, fontWeight: '800', width: 28 },
  topThumb: { width: 56, height: 80, borderRadius: 6, backgroundColor: '#0a0a0a' },
  topThumbFallback: { alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  topStats: { flexDirection: 'row', gap: 12, marginTop: 4 },
  topStat: { color: COLORS.textSecondary, fontSize: 11 },
  linkBox: { marginHorizontal: 16, marginTop: 32, padding: 16, borderRadius: 12, backgroundColor: 'rgba(0,170,255,0.06)', borderWidth: 1, borderColor: 'rgba(0,170,255,0.2)' },
  linkText: { color: COLORS.textSecondary, fontSize: 12 },
  linkUrl: { color: COLORS.neon, fontSize: 13, fontWeight: '700', marginTop: 6 },
});
