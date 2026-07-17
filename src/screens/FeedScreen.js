import { useEffect, useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, useWindowDimensions, DeviceEventEmitter } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useT } from '../i18n';
import { useAuthStore, useFeedStore } from '../store';
import VideoCard from '../components/VideoCard';
import LivesBar from '../components/LivesBar';
import PopupBoasVindas from '../components/PopupBoasVindas';
import blueAPI from '../api';
import { COLORS } from '../constants';

let _popupShownThisSession = false;

export default function FeedScreen() {
  const { videos, addVideos, setVideos, cursor, setCursor, hasMore, setHasMore, isLoading, setLoading, setCurrentIndex, feedMode, setFeedMode } = useFeedStore();
  const user = useAuthStore((s) => s.user);
  const setStoryUsers = useFeedStore((s) => s.setStoryUsers);
  const isFocused = useIsFocused();
  const t = useT();
  const listRef = useRef(null);

  // Stories ativos: alimenta o anel azul nos avatares dos videos (tocar no
  // avatar com anel abre o StoryViewer). Recarrega sempre que o feed foca.
  useEffect(() => {
    if (!isFocused) return;
    blueAPI.storiesFeed().then((d) => {
      const gs = (d && d.users) || [];
      setStoryUsers(new Set(gs.filter((g) => Array.isArray(g.stories) && g.stories.length > 0).map((g) => g.user_id)));
    }).catch(() => {});
  }, [isFocused]);
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  // Pill flutuante (estilo Instagram): o video ocupa a tela INTEIRA e a barra
  // flutua por cima — igual TikTok/Reels. Altura vem do onLayout real do
  // container (winH pode divergir em Android com gesture bar → snap drift).
  const [listH, setListH] = useState(0);
  const CARD_H = Math.max(1, Math.round(listH || winH));
  const [showPopup, setShowPopup] = useState(false);
  // Lote 7 — banner sutil quando feed transiciona pra seen_recycle
  const [bannerText, setBannerText] = useState(null);
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const emptyRoundsRef = useRef(0);
  const bannerTimerRef = useRef(null);

  const showBanner = useCallback((text) => {
    setBannerText(text);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    Animated.timing(bannerOpacity, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    bannerTimerRef.current = setTimeout(() => {
      Animated.timing(bannerOpacity, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => {
        setBannerText(null);
      });
    }, 3000);
  }, [bannerOpacity]);

  useEffect(() => () => { if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current); }, []);

  // Duplo-toque na aba Home: volta pro topo + recarrega o feed
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('bt-tab-reselect', (tab) => {
      if (tab !== 'Feed') return;
      try { listRef.current?.scrollToOffset({ offset: 0, animated: true }); } catch (e) {}
      loadFeed(true);
    });
    return () => sub.remove();
  }, [loadFeed]);

  useEffect(() => {
    // Popup de boas-vindas só pra usuário logado (guest cai direto no feed limpo)
    if (user && !_popupShownThisSession) {
      _popupShownThisSession = true;
      const t = setTimeout(() => setShowPopup(true), 600);
      return () => clearTimeout(t);
    }
  }, [user]);

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
        emptyRoundsRef.current = 0;
      } else {
        const seen = new Set(videos.map((v) => v.id));
        const deduped = incoming.filter((v) => !seen.has(v.id));
        if (deduped.length) {
          addVideos(deduped);
          emptyRoundsRef.current = 0;
        } else {
          // Lote 7 — em seen_recycle eh natural vir duplicatas as vezes.
          // Conta rounds vazios consecutivos pra prevenir loop sem matar feed:
          // 3 vazios seguidos = para temporariamente (ate user fazer reset).
          emptyRoundsRef.current = (emptyRoundsRef.current || 0) + 1;
          if (emptyRoundsRef.current >= 3) {
            console.warn('[FeedScreen] 3 rounds sem videos novos — pausando loadMore');
            setHasMore(false);
          }
        }
      }
      setCursor(d.next_cursor);
      setHasMore(!!d.has_more);
      // Lote 7 — detecta transicao fresh → seen_recycle e dispara banner
      const newMode = d.feed_mode || 'fresh';
      if (newMode !== feedMode) {
        setFeedMode(newMode);
        if (newMode === 'seen_recycle' && !reset) showBanner(t('feed_reprises'));
      }
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
        <Text style={styles.emptyText}>{t('feed_empty')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root} onLayout={(e) => setListH(e.nativeEvent.layout.height)}>
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
        onRefresh={() => loadFeed(true)}
        refreshing={isLoading && videos.length > 0}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80, minimumViewTime: 100 }}
      />
      <View style={[styles.livesOverlay, { top: insets.top }]} pointerEvents="box-none">
        <LivesBar />
      </View>
      {bannerText ? (
        <Animated.View
          style={[styles.feedModeBanner, { top: insets.top + 56, opacity: bannerOpacity }]}
          pointerEvents="none">
          <Text style={styles.feedModeBannerText}>{bannerText}</Text>
        </Animated.View>
      ) : null}
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
  feedModeBanner: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(2,8,23,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(0,170,255,0.35)',
    borderRadius: 100,
    paddingVertical: 9,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  feedModeBannerText: { color: '#fff', fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
});
