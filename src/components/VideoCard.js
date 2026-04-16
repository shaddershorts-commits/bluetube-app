import { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet, Dimensions, Share } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useFeedStore } from '../store';
import { COLORS } from '../constants';
import Avatar from './Avatar';
import ActionButton from './ActionButton';
import blueAPI from '../api';

const { width: W, height: H } = Dimensions.get('window');

export default function VideoCard({ video, index }) {
  const currentIndex = useFeedStore((s) => s.currentIndex);
  const isActive = currentIndex === index;
  const videoRef = useRef(null);
  const nav = useNavigation();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(video.likes || 0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.playAsync().catch(() => {});
      blueAPI.interact('view', video.id).catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [isActive]);

  const handleLike = async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes((l) => l + (wasLiked ? -1 : 1));
    await blueAPI.interact(wasLiked ? 'unlike' : 'like', video.id).catch(() => {});
  };

  const handleSave = async () => {
    setSaved(!saved);
    await blueAPI.salvar(video.id).catch(() => {});
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${video.title || 'Vídeo no Blue'} — https://bluetubeviral.com/blue-video.html?v=${video.id}`,
      });
    } catch {}
  };

  const creator = video.creator || {};

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={() => setMuted((m) => !m)}>
        <Video
          ref={videoRef}
          source={{ uri: video.video_url }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay={isActive}
          isMuted={muted}
        />
      </TouchableWithoutFeedback>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.gradient}
        pointerEvents="none"
      />

      <View style={styles.info}>
        <TouchableOpacity onPress={() => nav.navigate('PerfilUsuario', { user_id: video.user_id })}>
          <Text style={styles.username}>@{creator.username || 'blue'}</Text>
        </TouchableOpacity>
        {video.title ? <Text style={styles.title} numberOfLines={2}>{video.title}</Text> : null}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => nav.navigate('PerfilUsuario', { user_id: video.user_id })}>
          <Avatar uri={creator.avatar_url} initial={creator.display_name || creator.username} size={48} />
        </TouchableOpacity>
        <ActionButton icon={liked ? 'heart' : 'heart-outline'} count={likes} onPress={handleLike} active={liked} color={COLORS.red} />
        <ActionButton icon="chatbubble-outline" count={video.comments} onPress={() => nav.navigate('Comentarios', { video_id: video.id })} />
        <ActionButton icon={saved ? 'bookmark' : 'bookmark-outline'} count={video.saves} onPress={handleSave} active={saved} color={COLORS.neon} />
        <ActionButton icon="paper-plane-outline" onPress={handleShare} />
      </View>

      {muted && (
        <View style={styles.mutedIndicator}>
          <Text style={styles.mutedText}>🔇</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: W, height: H - 60, backgroundColor: '#000' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 300 },
  info: { position: 'absolute', bottom: 30, left: 16, right: 90 },
  username: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 8 },
  title: { color: '#fff', fontSize: 13, lineHeight: 18 },
  actions: { position: 'absolute', right: 10, bottom: 80, alignItems: 'center' },
  mutedIndicator: { position: 'absolute', top: '50%', alignSelf: 'center', backgroundColor: 'rgba(0,0,0,.5)', padding: 14, borderRadius: 50 },
  mutedText: { fontSize: 28 },
});
