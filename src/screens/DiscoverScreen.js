// Descobrir — grid 3 colunas com TODOS os videos do app (qualquer criador,
// seguindo ou nao), paginado por recencia. Hashtags em alta viram chips
// horizontais no topo (antes eram a tela inteira).
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView,
  RefreshControl, Image, useWindowDimensions, ActivityIndicator, DeviceEventEmitter,
  TextInput, Keyboard,
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
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorRef = useRef(null);
  const hasMoreRef = useRef(true);
  // busca (user 2026-07-24): nome PARCIAL acha perfis ("carlos" → @carlosdepol);
  // começar com # busca HASHTAGS (toca → feed da hashtag). Debounce 350ms.
  // Defensivo total: qualquer resposta estranha vira lista vazia, nunca erro.
  const [busca, setBusca] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState(null); // null = sem busca ativa
  const buscaDeb = useRef(null);
  const buscaSeq = useRef(0);
  const onBusca = (txt) => {
    setBusca(txt);
    if (buscaDeb.current) clearTimeout(buscaDeb.current);
    const q = String(txt || '').trim();
    if (!q) { setResultados(null); setBuscando(false); return; }
    setBuscando(true);
    const seq = ++buscaSeq.current;
    buscaDeb.current = setTimeout(() => {
      const isTag = q.startsWith('#');
      const termo = isTag ? q.slice(1).trim() : q;
      Promise.resolve()
        .then(() => (termo ? blueAPI.busca(termo) : null))
        .then((d) => {
          if (seq !== buscaSeq.current) return; // resposta velha: descarta
          const usuarios = Array.isArray(d?.usuarios) ? d.usuarios.filter((u) => u && u.user_id) : [];
          const hashtags = Array.isArray(d?.hashtags) ? d.hashtags.filter((t2) => t2 && t2.nome) : [];
          setResultados(isTag ? { usuarios: [], hashtags, soTag: true } : { usuarios, hashtags });
          setBuscando(false);
        })
        .catch(() => {
          if (seq !== buscaSeq.current) return;
          setResultados({ usuarios: [], hashtags: [] });
          setBuscando(false);
        });
    }, 350);
  };

  const cardW = (W - GAP * 4) / 3;
  const cardH = cardW * 1.55;

  const load = useCallback(async (reset = false) => {
    if (reset) { setLoading(true); cursorRef.current = null; hasMoreRef.current = true; }
    try {
      const vids = await blueAPI.explore(reset ? null : cursorRef.current);
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
      {/* barra de pesquisa: acha perfis por nome/@ (user 2026-07-24) */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color="rgba(200,225,255,0.45)" />
        <TextInput
          style={styles.searchInput}
          value={busca}
          onChangeText={onBusca}
          placeholder="Buscar perfis e criadores…"
          placeholderTextColor="rgba(200,225,255,0.35)"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {busca ? (
          <TouchableOpacity onPress={() => { setBusca(''); setResultados(null); Keyboard.dismiss(); }}>
            <Ionicons name="close-circle" size={18} color="rgba(200,225,255,0.45)" />
          </TouchableOpacity>
        ) : null}
      </View>
      {resultados !== null ? (
        <FlatList
          data={[
            ...(resultados.hashtags || []).map((t2, i) => ({ _k: 'h' + String(t2.id ?? t2.nome ?? i), tipo: 'hashtag', item: t2 })),
            ...(resultados.soTag ? [] : (resultados.usuarios || []).map((u, i) => ({ _k: 'u' + String(u.user_id ?? i), tipo: 'user', item: u }))),
          ]}
          keyExtractor={(row) => row._k}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item: row }) => {
            if (row.tipo === 'hashtag') {
              const tg = row.item;
              return (
                <TouchableOpacity style={styles.userRow} activeOpacity={0.7}
                  onPress={() => { Keyboard.dismiss(); nav.navigate('Hashtag', { tag: String(tg.nome || '') }); }}>
                  <View style={[styles.userAvatar, styles.userAvatarPh]}>
                    <Text style={{ color: COLORS.neon, fontSize: 18, fontWeight: '800' }}>#</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.userName} numberOfLines={1}>#{String(tg.nome || '')}</Text>
                    <Text style={styles.userDisplay}>{String(tg.usos || 0)} vídeos</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="rgba(200,225,255,0.3)" />
                </TouchableOpacity>
              );
            }
            const u = row.item;
            return (
              <TouchableOpacity style={styles.userRow} activeOpacity={0.7}
                onPress={() => { Keyboard.dismiss(); nav.navigate('PerfilUsuario', { user_id: u.user_id }); }}>
                {u.avatar_url ? (
                  <Image source={{ uri: u.avatar_url }} style={styles.userAvatar} />
                ) : (
                  <View style={[styles.userAvatar, styles.userAvatarPh]}>
                    <Ionicons name="person" size={18} color="rgba(200,225,255,0.4)" />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.userName} numberOfLines={1}>@{String(u.username || '')}</Text>
                    {u.verificado ? <Ionicons name="checkmark-circle" size={14} color={COLORS.neon} /> : null}
                  </View>
                  {u.display_name ? <Text style={styles.userDisplay} numberOfLines={1}>{String(u.display_name)}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(200,225,255,0.3)" />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            buscando
              ? <ActivityIndicator color={COLORS.neon} style={{ marginTop: 30 }} />
              : <Text style={styles.empty}>{busca.startsWith('#') ? 'Nenhuma hashtag encontrada' : 'Nenhum perfil encontrado'}</Text>
          }
        />
      ) : (
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
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>{t('discover_empty')}</Text> : null
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={COLORS.neon} style={{ marginVertical: 16 }} /> : null
        }
      />
      )}
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
  // busca de perfis
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginBottom: 8, paddingHorizontal: 12,
    backgroundColor: COLORS.surface, borderWidth: 1,
    borderColor: COLORS.border, borderRadius: 12, height: 42,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14, paddingVertical: 0 },
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface },
  userAvatarPh: { alignItems: 'center', justifyContent: 'center' },
  userName: { color: COLORS.text, fontSize: 14.5, fontWeight: '700' },
  userDisplay: { color: COLORS.textSecondary, fontSize: 12.5, marginTop: 1 },
});
