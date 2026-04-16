import { useEffect, useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore, useFeedStore } from '../store';
import VideoCard from '../components/VideoCard';
import LivesBar from '../components/LivesBar';
import PopupBoasVindas from '../components/PopupBoasVindas';
import blueAPI from '../api';
import { COLORS } from '../constants';

let _popupShownThisSession = false;

const { height: H } = Dimensions.get('window');
const TAB_H = 60;
const CARD_H = H - TAB_H;

export default function FeedScreen() {
  const { videos, addVideos, setVideos, cursor, setCursor, hasMore, setHasMore, isLoading, setLoading, setCurrentIndex } = useFeedStore();
  const user = useAuthStore((s) => s.user);
  const listRef = useRef(null);
  const insets = useSafeAreaInsets();
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
      const incoming = (d.videos || []).filter((v) => v && v.video_url);
      if (reset) {
        setVideos(incoming);
      } else {
        const seen = new Set(videos.map((v) => v.id));
        const deduped = incoming.filter((v) => !seen.has(v.id));
        if (deduped.length) addVideos(deduped);
      }
      setCursor(d.next_cursor);
      setHasMore(!!d.has_more);
    } catch (e) {}
    setLoading(false);
  }, [cursor, isLoading, videos]);

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
        renderItem={({ item, index }) => <VideoCard video={item} index={index} />}
        estimatedItemSize={CARD_H}
        snapToInterval={CARD_H}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
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
