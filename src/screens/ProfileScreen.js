import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
  RefreshControl, Alert, Image, Modal, Pressable, Linking, useWindowDimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import blueAPI from '../api';
import { useAuthStore } from '../store';
import { COLORS } from '../constants';

const SORT_MODES = [
  { key: 'recent', label: 'Recentes' },
  { key: 'popular', label: 'Populares' },
  { key: 'oldest', label: 'Antigos' },
];

function formatCount(n) {
  if (!n || n < 1000) return String(n || 0);
  if (n < 1_000_000) return (n / 1000).toFixed(n >= 10_000 ? 0 : 1) + 'K';
  return (n / 1_000_000).toFixed(1) + 'M';
}

function sortVideos(list, mode) {
  const arr = Array.isArray(list) ? [...list] : [];
  if (mode === 'popular') {
    arr.sort((a, b) => (b.views || 0) - (a.views || 0));
  } else if (mode === 'oldest') {
    arr.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
  } else {
    arr.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }
  return arr;
}

export default function ProfileScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const { logout } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState('recent');
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pr, vr, sr] = await Promise.all([
        blueAPI.meuPerfil().catch(() => null),
        blueAPI.meusVideos().catch(() => null),
        blueAPI.monetizacaoStatus().catch(() => null),
      ]);
      setProfile((pr && (pr.profile || pr)) || null);
      setVideos((vr && vr.videos) || []);
      setStats(sr || null);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleLogout = () => {
    setMenuOpen(false);
    Alert.alert('Sair', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  };

  const sortedVideos = useMemo(() => sortVideos(videos, sortMode), [videos, sortMode]);

  const totalViews = videos.reduce((a, v) => a + (v.views || 0), 0);
  const totalLikes = videos.reduce((a, v) => a + (v.likes || 0), 0);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.neon} /></View>;
  }

  // Grid: 3 colunas, card com aspect 9/16
  const GAP = 3;
  const cardW = (W - GAP * 4) / 3;
  const cardH = cardW * (16 / 9);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Topbar com username + hamburger */}
      <View style={styles.topbar}>
        <View style={{ width: 40 }} />
        <Text style={styles.topTitle} numberOfLines={1}>@{profile?.username || 'perfil'}</Text>
        <TouchableOpacity onPress={() => setMenuOpen(true)} hitSlop={10} style={styles.hamburger}>
          <Ionicons name="menu" size={26} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neon} />}
        contentContainerStyle={{ paddingBottom: 80 }}>

        {/* Header estilo TikTok: avatar + stats inline */}
        <View style={styles.header}>
          <Avatar uri={profile?.avatar_url} initial={profile?.display_name || profile?.username} size={96} />
          <Text style={styles.name}>{profile?.display_name || profile?.username || '—'}</Text>
          <Text style={styles.username}>@{profile?.username || 'blue'}</Text>

          <View style={styles.statsRow}>
            <Stat value={videos.length} label="Vídeos" />
            <Stat value={profile?.seguindo || 0} label="Seguindo" />
            <Stat value={profile?.seguidores || 0} label="Seguidores" />
            <Stat value={totalLikes} label="Curtidas" />
          </View>

          {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          {/* Botoes de acao */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => Alert.alert('Em breve', 'Edição de perfil em construção. Por enquanto use o site.')}>
              <Text style={styles.actionBtnText}>Editar perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnSquare} onPress={() => nav.navigate('Chat')}>
              <Ionicons name="chatbubble-outline" size={18} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnSquare} onPress={() => setMenuOpen(true)}>
              <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filtros de ordenacao */}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>ORDENAR POR</Text>
          <View style={styles.sortBtns}>
            {SORT_MODES.map((m) => (
              <TouchableOpacity
                key={m.key}
                onPress={() => setSortMode(m.key)}
                style={[styles.sortBtn, sortMode === m.key && styles.sortBtnActive]}>
                <Text style={[styles.sortBtnText, sortMode === m.key && styles.sortBtnTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Grid de videos */}
        <View style={[styles.grid, { padding: GAP, gap: GAP }]}>
          {sortedVideos.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🎬</Text>
              <Text style={styles.emptyText}>Nenhum vídeo ainda</Text>
              <Text style={styles.emptyHint}>Os vídeos que você postar aparecem aqui</Text>
            </View>
          ) : (
            sortedVideos.map((v) => (
              <GridCard
                key={v.id}
                video={v}
                width={cardW}
                height={cardH}
                onPress={() => Linking.openURL(`https://bluetubeviral.com/blue-video?v=${v.id}`).catch(() => {})}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Menu hamburger (bottom sheet) */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={[styles.menuSheet, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.menuHandle} />
            <MenuItem icon="person-outline" label="Editar perfil" onPress={() => { setMenuOpen(false); Alert.alert('Em breve', 'Edição no app em construção'); }} />
            <MenuItem icon="bookmark-outline" label="Salvos" onPress={() => { setMenuOpen(false); Alert.alert('Em breve', 'Lista de salvos em construção'); }} />
            <MenuItem icon="notifications-outline" label="Notificações" onPress={() => { setMenuOpen(false); nav.navigate('Chat'); }} />
            <MenuItem
              icon="analytics-outline"
              label="Analytics"
              onPress={() => { setMenuOpen(false); Alert.alert('Em breve', 'Analytics completo disponível em bluetubeviral.com/blue-analytics'); }}
            />
            <MenuItem
              icon="cash-outline"
              label={stats?.tem_conta ? `Monetização — R$${(stats.saldo_disponivel || 0).toFixed(2)}` : 'Monetização'}
              onPress={() => { setMenuOpen(false); Alert.alert('Em breve', 'Saques via app em construção — use o site por enquanto'); }}
            />
            <MenuItem icon="settings-outline" label="Configurações" onPress={() => { setMenuOpen(false); Alert.alert('Em breve', 'Configurações em construção'); }} />
            <MenuItem icon="share-social-outline" label="Compartilhar perfil" onPress={() => { setMenuOpen(false); Alert.alert('Link copiado', `https://bluetubeviral.com/blue?u=${profile?.username || ''}`); }} />
            <View style={styles.menuDivider} />
            <MenuItem icon="log-out-outline" label="Sair" onPress={handleLogout} color={COLORS.red} />
          </Pressable>
        </Pressable>
      </Modal>
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

function GridCard({ video, width, height, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.gridCard, { width, height }]}>
      {video.thumbnail_url ? (
        <Image source={{ uri: video.thumbnail_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.gridFallback]}>
          <Ionicons name="play" size={28} color="rgba(255,255,255,0.4)" />
        </View>
      )}
      <View style={styles.gridOverlay} />
      <View style={styles.gridViewsBadge}>
        <Ionicons name="play" size={10} color="#fff" />
        <Text style={styles.gridViewsText}>{formatCount(video.views || 0)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function MenuItem({ icon, label, onPress, color }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color={color || COLORS.text} />
      <Text style={[styles.menuLabel, color && { color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },

  topbar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  topTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  hamburger: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  header: { alignItems: 'center', paddingTop: 20, paddingHorizontal: 20, paddingBottom: 12 },
  name: { color: COLORS.text, fontSize: 20, fontWeight: '800', marginTop: 12 },
  username: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  bio: { color: COLORS.text, fontSize: 13, textAlign: 'center', marginTop: 12, paddingHorizontal: 16, lineHeight: 19 },

  statsRow: { flexDirection: 'row', gap: 28, marginTop: 16 },
  stat: { alignItems: 'center' },
  statValue: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  statLabel: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 18, width: '100%' },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  actionBtnPrimary: { backgroundColor: 'rgba(255,255,255,0.03)' },
  actionBtnText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  actionBtnSquare: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },

  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sortLabel: { color: 'rgba(232,244,255,0.4)', fontSize: 10, fontWeight: '700', letterSpacing: 0.6, flex: 1 },
  sortBtns: { flexDirection: 'row', gap: 6 },
  sortBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  sortBtnActive: { backgroundColor: COLORS.neon, borderColor: COLORS.neon },
  sortBtnText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  sortBtnTextActive: { color: '#fff' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  gridFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  gridViewsBadge: {
    position: 'absolute', bottom: 6, left: 6,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  gridViewsText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  empty: { width: '100%', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 44, marginBottom: 10 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  emptyHint: { color: COLORS.textDim, fontSize: 12, marginTop: 6 },

  menuBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#0a0f1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 14,
  },
  menuHandle: {
    width: 42, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center', marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 6,
  },
  menuLabel: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: '500' },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 6,
  },
});
