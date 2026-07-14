import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity,
  Image, useWindowDimensions, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import blueAPI from '../api';
import { COLORS } from '../constants';

function formatCount(n) {
  if (!n || n < 1000) return String(n || 0);
  if (n < 1_000_000) return (n / 1000).toFixed(n >= 10_000 ? 0 : 1) + 'K';
  return (n / 1_000_000).toFixed(1) + 'M';
}

export default function PerfilUsuarioScreen({ route }) {
  // Deep link /blue/@:username passa { username }; navegacao interna passa { user_id }
  const { user_id: paramUserId, username: paramUsername } = route.params || {};
  const { width: W } = useWindowDimensions();
  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Resolve perfil por user_id OU username (deep link)
        const pr = paramUserId
          ? await blueAPI.perfil(paramUserId).catch(() => null)
          : paramUsername
          ? await blueAPI.perfilPorUsername(paramUsername).catch(() => null)
          : null;
        const p = (pr && (pr.profile || pr)) || null;
        if (cancelled) return;
        setProfile(p);

        if (!p?.user_id) {
          setLoading(false);
          return;
        }

        const [vr, fr] = await Promise.all([
          blueAPI.videosDoUsuario(p.user_id).catch(() => null),
          blueAPI.estouSeguindo(p.user_id).catch(() => ({ following: false })),
        ]);
        if (cancelled) return;
        setVideos((vr && vr.videos) || []);
        setIsFollowing(!!fr?.following);
        setFollowerCount(p.seguidores || 0);
      } catch {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [paramUserId, paramUsername]);

  const toggleFollow = useCallback(async () => {
    if (followBusy || !profile?.user_id) return;
    setFollowBusy(true);
    const wasFollowing = isFollowing;
    // Optimistic update
    setIsFollowing(!wasFollowing);
    setFollowerCount((c) => Math.max(0, c + (wasFollowing ? -1 : 1)));
    try {
      const r = wasFollowing
        ? await blueAPI.deixarDeSeguir(profile.user_id)
        : await blueAPI.seguir(profile.user_id);
      if (r?.error) throw new Error(r.error);
      if (typeof r?.following === 'boolean') setIsFollowing(r.following);
    } catch (e) {
      // Rollback
      setIsFollowing(wasFollowing);
      setFollowerCount((c) => Math.max(0, c + (wasFollowing ? 1 : -1)));
      Alert.alert('Erro', e.message || 'Tenta de novo em alguns segundos.');
    }
    setFollowBusy(false);
  }, [isFollowing, followBusy, profile?.user_id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.neon} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <Header title="Perfil" showBack />
        <View style={styles.center}>
          <Text style={styles.emptyText}>Perfil não encontrado</Text>
        </View>
      </View>
    );
  }

  const GAP = 3;
  const cardW = (W - GAP * 4) / 3;
  const cardH = cardW * (16 / 9);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header title={`@${profile.username || ''}`} showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.hero}>
          <Avatar uri={profile.avatar_url} initial={profile.display_name || profile.username} size={92} />
          <Text style={styles.name}>{profile.display_name || profile.username}</Text>
          <Text style={styles.username}>@{profile.username}</Text>

          <View style={styles.statsRow}>
            <Stat value={videos.length} label="Vídeos" />
            <Stat value={profile.seguindo || 0} label="Seguindo" />
            <Stat value={followerCount} label="Seguidores" />
          </View>

          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          <TouchableOpacity
            style={[styles.followBtn, isFollowing && styles.followingBtn, followBusy && styles.busyBtn]}
            onPress={toggleFollow}
            disabled={followBusy}
            activeOpacity={0.85}>
            {followBusy ? (
              <ActivityIndicator color={isFollowing ? COLORS.text : '#fff'} size="small" />
            ) : (
              <Text style={[styles.followText, isFollowing && styles.followingText]}>
                {isFollowing ? '✓ Seguindo' : '+ Seguir'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.grid, { padding: GAP, gap: GAP }]}>
          {videos.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🎬</Text>
              <Text style={styles.emptyText}>Nenhum vídeo ainda</Text>
            </View>
          ) : (
            videos.map((v) => (
              <View key={v.id} style={[styles.gridCard, { width: cardW, height: cardH }]}>
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
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{formatCount(value)}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  hero: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 },
  name: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginTop: 12 },
  username: { color: COLORS.textSecondary, marginTop: 2 },
  bio: { color: COLORS.text, fontSize: 13, textAlign: 'center', marginTop: 10, paddingHorizontal: 14, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 28, marginTop: 14 },
  stat: { alignItems: 'center' },
  statValue: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  statLabel: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  followBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 34,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 18,
    minWidth: 160,
    alignItems: 'center',
  },
  followingBtn: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  busyBtn: { opacity: 0.7 },
  followText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  followingText: { color: COLORS.text },
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
