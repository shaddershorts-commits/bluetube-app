import { useEffect, useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useAuthStore, useFeedStore } from '../store';
import VideoCard from '../components/VideoCard';
import LivesBar from '../components/LivesBar';
import PopupBoasVindas from '../components/PopupBoasVindas';
import blueAPI from '../api';
import { COLORS } from '../constants';

let _popupShownThisSession = false;

export default function FeedScreen() {
  const { videos, addVideos, setVideos, cursor, setCursor, hasMore, setHasMore, isLoading, setLoading, setCurrentIndex } = useFeedStore();
  const user = useAuthStore((s) => s.user);
  const listRef = useRef(null);
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  let tabH = 0;
  try { tabH = useBottomTabBarHeight(); } catch (_) { tabH = 60; }
  // Altura real disponivel pro card: viewport menos a tab bar (que ja inclui safe-area bottom).
  // Sem isso, snapToInterval usa H-60 e desalinha em devices com gesture bar/notch.
  const CARD_H = Math.max(1, Math.round(winH - tabH));
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (!_popupShownThisSession) {
      _popupShownThisSession = true;
      const t = setTimeout(() => setShowPopup(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const loadFeed = useCallback(async (reset = false) => {
    if (isLoading) return;
    setLoading(true);
    try {
      const d = await blueAPI.feed(reset ? null : cursor);
      const videosData = d && d.videos;
      const safeVideos = Array.isArray(videosData) ? videosData : [];
      // Guard mais agressivo: precisa ter id, video_url e user_id (renderItem do FlashList
      // crashava quando vinha video mal-formado/null da API e tentava acessar v.id sem check)
      const incoming = safeVideos.filter((v) =>
        v && typeof v === 'object' && v.id && v.video_url && v.user_id
      );
      if (reset) {
        setVideos(incoming);
      } else {
        const seen = new Set(videos.map((v) => v.id));
        const deduped = incoming.filter((v) => !seen.has(v.id));
        if (deduped.length) addVideos(deduped);
        // Se nao veio nada novo E hasMore ainda tava true, marca false defensivamente
        // (evita loop infinito do onEndReached chamando loadFeed que nao adiciona nada)
        if (!deduped.length && hasMore) setHasMore(false);
      }
      setCursor(d.next_cursor);
      setHasMore(!!d.has_more);
    } catch (e) {
      // NAO silenciar (regra do user). Log no console + Sentry.
      console.error('[FeedScreen] loadFeed falhou:', e?.message || e, {
        reset, cursor, hasMore, videosCount: videos.length,
      });
      try {
        const Sentry = require('@sentry/react-native');
        if (Sentry?.captureException) {
          Sentry.captureException(e, {
            tags: { source: 'FeedScreen.loadFeed', reset: String(reset) },
            extra: { cursor, hasMore, videosCount: videos.length },
          });
        }
      } catch (_) { /* sentry opcional, fail-soft */ }
    }
    setLoading(false);
  }, [cursor, isLoading, videos, hasMore]);

  useEffect(() => {
    if (videos.length === 0) loadFeed(true);
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  if (isLoading && videos.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.neon} size="large" />
      </View>
    );
  }

  if (!videos.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>🎬</Text>
        <Text style={styles.emptyText}>Nenhum vídeo ainda.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlashList
        ref={listRef}
        data={videos}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          // Guard defensivo: ignora videos invalidos sem crashar o FlashList inteiro
          if (!item || !item.id || !item.video_url) return null;
          return <VideoCard video={item} index={index} cardHeight={CARD_H} />;
        }}
        estimatedItemSize={CARD_H}
        snapToInterval={CARD_H}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onEndReached={() => hasMore && loadFeed(false)}
        onEndReachedThreshold={2}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80, minimumViewTime: 100 }}
      />
      <View style={[styles.livesOverlay, { top: insets.top }]} pointerEvents="box-none">
        <LivesBar />
      </View>
      <PopupBoasVindas
        visible={showPopup}
        username={user?.user_metadata?.username || user?.email?.split('@')[0]}
        onClose={() => setShowPopup(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  livesOverlay: { position: 'absolute', left: 0, right: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14 },
});
