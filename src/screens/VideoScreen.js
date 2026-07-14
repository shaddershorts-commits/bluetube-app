// Tela de video CONTEXTUAL — abre no video tocado e, ao rolar, continua nos
// videos DAQUELE contexto (perfil do usuario, explorar, lista de salvos...),
// sem precisar sair e entrar de novo. Substitui o fallback de navegador.
//
// params:
//   videos: lista pronta (grids passam o array que ja carregaram)
//   startIndex: indice do video tocado
//   mode: 'user' | 'explore' | 'list' | 'single'
//   cursor: (explore) continua a paginacao de onde o grid parou
//   creator: (user) perfil dono dos videos — enriquece cards sem creator
//   video_id: (single/deep-link) busca 1 video via API
import { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import VideoCard from '../components/VideoCard';
import blueAPI from '../api';
import { COLORS } from '../constants';
import { useT } from '../i18n';

export default function VideoScreen({ route, navigation }) {
  const {
    videos: videosParam, startIndex = 0, mode = 'single',
    cursor: cursorParam, creator, video_id,
  } = route.params || {};
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const [listH, setListH] = useState(0);
  const CARD_H = Math.max(1, Math.round(listH || winH));

  const enrich = useCallback((v) => (v && !v.creator && creator ? { ...v, creator } : v), [creator]);

  const [videos, setVideos] = useState(() => (Array.isArray(videosParam) ? videosParam.map(enrich) : []));
  const [activeIdx, setActiveIdx] = useState(startIndex);
  const [loading, setLoading] = useState(!videosParam?.length);
  const [error, setError] = useState(false);
  const cursorRef = useRef(cursorParam || null);
  const hasMoreRef = useRef(mode === 'explore' && !!cursorParam);
  const loadingMoreRef = useRef(false);

  // single/deep-link: busca o video (com creator enriquecido pelo backend).
  // Tambem roda quando o grid passou o video SEM creator (perfil proprio etc)
  useEffect(() => {
    const needFetch = !videos.length && (video_id || videosParam?.[0]?.id);
    if (!needFetch) return;
    let cancelled = false;
    (async () => {
      try {
        const d = await blueAPI.videoById(video_id || videosParam[0].id);
        const v = d?.videos?.[0] || d?.video;
        if (!cancelled) {
          if (v && v.video_url) setVideos([v]);
          else setError(true);
        }
      } catch (_) { if (!cancelled) setError(true); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Enriquecimento tardio de creator: itens vindos de listas sem profile
  // (ex.: Salvos) mostravam "@blue" e avatar vazio. Busca os perfis que
  // faltam (1 fetch por user unico, max 10) e mescla.
  useEffect(() => {
    const missing = [...new Set(videos.filter((v) => v && !v.creator && v.user_id).map((v) => v.user_id))].slice(0, 10);
    if (!missing.length) return;
    let cancelled = false;
    (async () => {
      const profs = {};
      await Promise.all(missing.map(async (uid) => {
        try {
          const d = await blueAPI.perfil(uid);
          const p = d?.profile || d;
          if (p?.user_id || p?.username) profs[uid] = p;
        } catch (_) {}
      }));
      if (!cancelled && Object.keys(profs).length) {
        setVideos((prev) => prev.map((v) => (v && !v.creator && profs[v.user_id] ? { ...v, creator: profs[v.user_id] } : v)));
      }
    })();
    return () => { cancelled = true; };
  }, [videos.length]);

  // explore: continua paginando do cursor que o grid parou
  const loadMore = useCallback(async () => {
    if (!hasMoreRef.current || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    try {
      const d = await blueAPI.explore(cursorRef.current);
      const incoming = (d?.videos || []).filter((v) => v && v.id && v.video_url);
      setVideos((prev) => {
        const seen = new Set(prev.map((v) => v.id));
        return [...prev, ...incoming.filter((v) => !seen.has(v.id))];
      });
      cursorRef.current = d?.next_cursor || null;
      hasMoreRef.current = !!d?.has_more && !!d?.next_cursor;
    } catch (_) {}
    loadingMoreRef.current = false;
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setActiveIdx(viewableItems[0].index);
  }).current;

  return (
    <View style={styles.root} onLayout={(e) => setListH(e.nativeEvent.layout.height)}>
      {loading && !videos.length ? (
        <ActivityIndicator color={COLORS.neon} size="large" style={{ flex: 1 }} />
      ) : error || !videos.length ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🎬</Text>
          <Text style={styles.emptyText}>{t('video_notfound')}</Text>
        </View>
      ) : (
        <FlashList
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            if (!item || !item.id || !item.video_url) return null;
            return <VideoCard video={item} index={index} cardHeight={CARD_H} activeOverride={index === activeIdx} />;
          }}
          estimatedItemSize={CARD_H}
          snapToInterval={CARD_H}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          pagingEnabled
          initialScrollIndex={Math.min(startIndex, Math.max(0, videos.length - 1))}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={2}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 80, minimumViewTime: 100 }}
        />
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
