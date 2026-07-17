// Descobrir — grid 3 colunas com TODOS os videos do app (qualquer criador,
// seguindo ou nao), paginado por recencia. Hashtags em alta viram chips
// horizontais no topo (antes eram a tela inteira).
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView,
  RefreshControl, Image, useWindowDimensions, ActivityIndicator, DeviceEventEmitter,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import blueAPI from '../api';
import { COLORS } from '../constants';
import { useT } from '../i18n';

const GAP = 2;

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}

export default function DiscoverScreen() {
  const nav = useNavigation();
  const t = useT();
  const { width: W } = useWindowDimensions();
  const [hashtags, setHashtags] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorRef = useRef(null);
  const hasMoreRef = useRef(true);

  const cardW = (W - GAP * 4) / 3;
  const cardH = cardW * 1.55;

  const load = useCallback(async (reset = false) => {
    if (reset) { setLoading(true); cursorRef.current = null; hasMoreRef.current = true; }
    try {
      const [tags, vids] = await Promise.all([
        blueAPI.trending().catch(() => null),
        blueAPI.explore(reset ? null : cursorRef.current),
      ]);
      if (tags?.hashtags) setHashtags(tags.hashtags);
      const incoming = (vids?.videos || []).filter((v) => v && v.id && v.video_url);
      setVideos((prev) => {
        if (reset) return incoming;
        const seen = new Set(prev.map((v) => v.id));
        return [...prev, ...incoming.filter((v) => !seen.has(v.id))];
      });
      cursorRef.current = vids?.next_cursor || null;
      hasMoreRef.current = !!vids?.has_more && !!vids?.next_cursor;
    } catch (_) {}
    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => { load(true); }, []);

  // Duplo-toque na aba Explorar: topo + refresh
  const gridRef = useRef(null);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('bt-tab-reselect', (tab) => {
      if (tab !== 'Descobrir') return;
      try { gridRef.current?.scrollToOffset({ offset: 0, animated: true }); } catch (e) {}
      load(true);
    });
    return () => sub.remove();
  }, [load]);

  const loadMore = () => {
    if (loadingMore || loading || !hasMoreRef.current) return;
    setLoadingMore(true);
    load(false);
  };

  const renderVideo = ({ item: v, index }) => (
    <TouchableOpacity
      style={[styles.card, { width: cardW, height: cardH }]}
      activeOpacity={0.75}
      onPress={() => nav.navigate('Video', { videos, startIndex: index, mode: 'explore', cursor: cursorRef.current })}>
      {v.thumbnail_url ? (
        <Image source={{ uri: v.thumbnail_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]}>
          <Ionicons name="play" size={22} color="rgba(255,255,255,0.4)" />
        </View>
      )}
      <View style={styles.badge}>
        <Ionicons name="play" size={10} color="#fff" />
        <Text style={styles.badgeText}>{formatCount(v.views)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header title={t('discover_title')} />
      <FlatList
        ref={gridRef}
        data={videos}
        keyExtractor={(v) => v.id}
        renderItem={renderVideo}
        numColumns={3}
        columnWrapperStyle={{ gap: GAP, paddingHorizontal: GAP }}
        contentContainerStyle={{ gap: GAP, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(true)} tintColor={COLORS.neon} />}
        onEndReached={loadMore}
        onEndReachedThreshold={1.5}
        ListHeaderComponent={
          hashtags.length > 0 ? (
            <View style={styles.tagsWrap}>
              <Text style={styles.tagsTitle}>🔥 {t('discover_tags')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
                {hashtags.map((tg, i) => (
                  <TouchableOpacity
                    key={tg.id || i}
                    style={styles.chip}
                    activeOpacity={0.7}
                    onPress={() => nav.navigate('Hashtag', { tag: tg.nome })}>
                    <Text style={styles.chipText}>#{tg.nome}</Text>
                    <Text style={styles.chipCount}>{tg.usos}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>{t('discover_empty')}</Text> : null
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={COLORS.neon} style={{ marginVertical: 16 }} /> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tagsWrap: { paddingVertical: 10 },
  tagsTitle: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 14 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,170,255,0.08)', borderWidth: 1, borderColor: 'rgba(0,170,255,0.25)',
    borderRadius: 100, paddingVertical: 7, paddingHorizontal: 14,
  },
  chipText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  chipCount: { color: COLORS.textDim, fontSize: 11 },
  card: { backgroundColor: '#0a1020', borderRadius: 4, overflow: 'hidden' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 100, paddingVertical: 2, paddingHorizontal: 7,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  empty: { color: COLORS.textSecondary, padding: 40, textAlign: 'center', fontSize: 13 },
});
