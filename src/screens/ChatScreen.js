// Chat estilo WhatsApp: abas Conversas / Status / Chamadas + menu ⋮,
// barra de busca por nome, conversas 1:1 + grupos na mesma lista,
// FAB de novo grupo. Status = stories (mesmo backend do feed).
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, TextInput, Modal, Pressable,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import blueAPI from '../api';
import GlassMenu from '../components/GlassMenu';
import { openModeration } from '../utils/moderation';
import { COLORS } from '../constants';

function fmtHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) {
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  const ontem = new Date(hoje.getTime() - 86400000);
  if (d.toDateString() === ontem.toDateString()) return 'ontem';
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
}

export default function ChatScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('conversas'); // conversas | status | chamadas
  const [busca, setBusca] = useState('');
  const [conversas, setConversas] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [statusGroups, setStatusGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [convMenu, setConvMenu] = useState(null); // item alvo do long-press
  const [showRequests, setShowRequests] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, g, s] = await Promise.all([
        blueAPI.conversas().catch(() => null),
        blueAPI.meusGrupos().catch(() => null),
        blueAPI.storiesFeed().catch(() => null),
      ]);
      setConversas(c?.conversations || []);
      setGrupos(g?.grupos || []);
      setStatusGroups((s?.users || []).filter((u) => Array.isArray(u.stories) && u.stories.length > 0));
    } catch (_) {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Lista unificada: 1:1 + grupos, ordenada por última mensagem
  const todos = [
    ...conversas.map((c) => ({ tipo: '1a1', id: 'c_' + c.id, nome: (c.other?.display_name || c.other?.username || 'Usuário'), sub: c.last_message || 'Sem mensagens', quando: c.last_message_at, unread: c.unread || 0, raw: c })),
    ...grupos.map((g) => ({ tipo: 'grupo', id: 'g_' + g.id, nome: g.nome, sub: g.last_message || (g.descricao || 'Grupo'), quando: g.last_message_at || g.created_at, unread: 0, raw: g })),
  ]
    .filter((i) => !busca.trim() || i.nome.toLowerCase().includes(busca.trim().toLowerCase()))
    .sort((a, b) => new Date(b.quando || 0) - new Date(a.quando || 0));

  // "Novos contatos": quem me chamou e eu ainda não adicionei (estilo WhatsApp)
  const requests = todos.filter((i) => i.tipo === '1a1' && i.raw.is_request);
  const principais = todos
    .filter((i) => !(i.tipo === '1a1' && i.raw.is_request))
    .sort((a, b) => ((b.raw.pinned ? 1 : 0) - (a.raw.pinned ? 1 : 0)) || (new Date(b.quando || 0) - new Date(a.quando || 0)));
  const itens = [
    ...(requests.length ? [{ tipo: 'reqheader', id: 'reqheader', count: requests.reduce((n, r) => n + (r.unread || 0), 0) || requests.length }] : []),
    ...(showRequests ? requests : []),
    ...principais,
  ];

  const abrir = (item) => {
    if (item.tipo === 'grupo') nav.navigate('Conversa', { grupo: item.raw });
    else nav.navigate('Conversa', { conversation_id: item.raw.id, other: item.raw.other, is_request: !!item.raw.is_request });
  };

  const renderConversa = ({ item }) => {
    if (item.tipo === 'reqheader') {
      return (
        <TouchableOpacity style={styles.reqHeader} onPress={() => setShowRequests((v) => !v)}>
          <View style={styles.reqBell}><Ionicons name="notifications" size={16} color="#fff" /></View>
          <Text style={styles.reqTitle}>Novos contatos</Text>
          <View style={styles.reqBadge}><Text style={styles.reqBadgeText}>{item.count}</Text></View>
          <Ionicons name={showRequests ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textDim} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      );
    }
    return (
    <TouchableOpacity style={styles.item} onPress={() => abrir(item)} onLongPress={() => setConvMenu(item)} delayLongPress={350}>
      {item.tipo === 'grupo'
        ? <View style={styles.groupAv}><Ionicons name="people" size={22} color={COLORS.neon} /></View>
        : <Avatar uri={item.raw.other?.avatar_url} initial={item.nome} size={50} />}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.nome}</Text>
        <Text style={styles.last} numberOfLines={1}>{item.sub}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={[styles.hora, item.unread > 0 && { color: COLORS.neon }]}>{fmtHora(item.quando)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {item.raw.pinned ? <Ionicons name="pin" size={13} color={COLORS.textDim} /> : null}
          {item.unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{item.unread}</Text></View>}
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  // Ações do long-press (menu liquid glass)
  const convMenuOptions = () => {
    const it = convMenu;
    if (!it) return [];
    if (it.tipo === 'grupo') {
      return [
        { icon: 'information-circle-outline', label: 'Dados do grupo', onPress: () => nav.navigate('GrupoInfo', { grupo: it.raw }) },
        { icon: 'exit-outline', label: 'Sair do grupo', danger: true, onPress: async () => { await blueAPI.grupoSair(it.raw.id).catch(() => {}); load(); } },
      ];
    }
    return [
      { icon: 'pin-outline', label: it.raw.pinned ? 'Desafixar conversa' : 'Fixar conversa', onPress: async () => { await blueAPI.convPin(it.raw.id).catch(() => {}); load(); } },
      { icon: 'trash-outline', label: 'Apagar conversa', danger: true, onPress: async () => { await blueAPI.convClear(it.raw.id).catch(() => {}); load(); } },
      { icon: 'hand-left-outline', label: 'Bloquear', danger: true, onPress: () => openModeration(nav, { tipoAlvo: 'usuario', alvoId: it.raw.other?.user_id, userId: it.raw.other?.user_id, username: it.raw.other?.username, onBlocked: () => load() }) },
    ];
  };

  const renderStatus = ({ item }) => {
    const vistos = item.stories.every((s) => s.visto);
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => nav.navigate('StoryViewer', { users: statusGroups, startUserIndex: statusGroups.indexOf(item) })}>
        <View style={[styles.statusRing, !vistos && { borderColor: COLORS.neon }]}>
          <Avatar uri={item.avatar_url} initial={item.display_name || item.username} size={48} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>@{item.username}</Text>
          <Text style={styles.last}>{item.stories.length} {item.stories.length === 1 ? 'status' : 'status'} · {fmtHora(item.stories[item.stories.length - 1]?.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: insets.top }}>
      {/* Header: título + ⋮ */}
      <View style={styles.topbar}>
        <Text style={styles.title}>Chat</Text>
        <TouchableOpacity onPress={() => setMenuOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="ellipsis-vertical" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Abas estilo WhatsApp */}
      <View style={styles.tabs}>
        {[['conversas', 'Conversas'], ['status', 'Status'], ['chamadas', 'Chamadas']].map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.tabBtn, tab === key && styles.tabBtnActive]} onPress={() => setTab(key)}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Busca */}
      {tab === 'conversas' && (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={COLORS.textDim} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar conversa…"
            placeholderTextColor={COLORS.textDim}
            value={busca}
            onChangeText={setBusca}
          />
          {busca ? (
            <TouchableOpacity onPress={() => setBusca('')}><Ionicons name="close-circle" size={16} color={COLORS.textDim} /></TouchableOpacity>
          ) : null}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={COLORS.neon} style={{ marginTop: 40 }} />
      ) : tab === 'conversas' ? (
        itens.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>{busca ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}</Text>
            <Text style={styles.emptySub}>{busca ? 'Tenta outro nome' : 'Envie uma mensagem pelo perfil de alguém'}</Text>
          </View>
        ) : (
          <FlatList
            data={itens}
            keyExtractor={(i) => i.id}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.neon} />}
            renderItem={renderConversa}
            contentContainerStyle={{ paddingBottom: 140 }}
          />
        )
      ) : tab === 'status' ? (
        statusGroups.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📸</Text>
            <Text style={styles.emptyText}>Nenhum status agora</Text>
            <Text style={styles.emptySub}>Os stories de quem você segue aparecem aqui</Text>
          </View>
        ) : (
          <FlatList
            data={statusGroups}
            keyExtractor={(i) => i.user_id}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.neon} />}
            renderItem={renderStatus}
            contentContainerStyle={{ paddingBottom: 140 }}
          />
        )
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📞</Text>
          <Text style={styles.emptyText}>Chamadas em breve</Text>
          <Text style={styles.emptySub}>Ligações de voz e vídeo estão chegando</Text>
        </View>
      )}

      {/* FAB novo grupo */}
      {tab === 'conversas' && (
        <TouchableOpacity style={styles.fab} onPress={() => nav.navigate('CriarGrupo')}>
          <Ionicons name="people" size={22} color="#fff" />
          <Ionicons name="add" size={14} color="#fff" style={styles.fabPlus} />
        </TouchableOpacity>
      )}

      {/* Menu ⋮ */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menuCard, { top: insets.top + 44 }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); nav.navigate('CriarGrupo'); }}>
              <Text style={styles.menuText}>Novo grupo</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <View style={styles.menuItem}>
              <Text style={[styles.menuText, { color: COLORS.textDim }]}>Mais opções em breve…</Text>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Menu liquid glass do long-press na conversa */}
      <GlassMenu
        visible={!!convMenu}
        title={convMenu?.nome}
        options={convMenuOptions()}
        onClose={() => setConvMenu(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  reqHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginBottom: 6, padding: 12, borderRadius: 14, backgroundColor: 'rgba(0,170,255,0.07)', borderWidth: 1, borderColor: 'rgba(0,170,255,0.2)' },
  reqBell: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  reqTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  reqBadge: { backgroundColor: '#ff4757', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  reqBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  tabs: { flexDirection: 'row', paddingHorizontal: 10, gap: 6, marginBottom: 8 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 100, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  tabBtnActive: { backgroundColor: 'rgba(0,170,255,0.15)' },
  tabText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: COLORS.neon, fontWeight: '800' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: 12, marginHorizontal: 12, marginBottom: 6, paddingHorizontal: 12 },
  searchInput: { flex: 1, paddingVertical: 9, color: COLORS.text, fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  emptySub: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  groupAv: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,170,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  statusRing: { padding: 2, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  info: { flex: 1 },
  name: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  last: { color: COLORS.textSecondary, fontSize: 12 },
  meta: { alignItems: 'flex-end', gap: 4 },
  hora: { color: COLORS.textDim, fontSize: 11 },
  badge: { backgroundColor: COLORS.neon, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  fab: { position: 'absolute', right: 18, bottom: 96, width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.neon, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  fabPlus: { position: 'absolute', top: 10, right: 10 },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  menuCard: { position: 'absolute', right: 12, backgroundColor: '#0a1020', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,170,255,0.2)', minWidth: 190, overflow: 'hidden' },
  menuItem: { paddingHorizontal: 16, paddingVertical: 13 },
  menuText: { color: COLORS.text, fontSize: 14 },
  menuDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
});
