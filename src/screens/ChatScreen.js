// BlueChat: abas Conversas / Status / Chamadas + menu ⋮.
// - Conversas: 1:1 + grupos, busca, fixar, "Novos contatos"; FAB abre o
//   AddContactSheet (adicionar usuário com aceite — grupo fica no menu ⋮).
// - Status: mecânica WhatsApp — só CONTATOS aceitos veem (audience='status'),
//   dura 24h, quem viu/curtiu/comentou aparece no viewer; FAB posta direto.
// - Tema: cores/fonte/ícones vêm de useChatTheme (Configurações → Temas).
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, TextInput, Modal, Pressable, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Avatar from '../components/Avatar';
import blueAPI from '../api';
import GlassMenu from '../components/GlassMenu';
import AddContactSheet from '../components/AddContactSheet';
import { openModeration } from '../utils/moderation';
import { useChatTheme, themedIcon } from '../store/theme';
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
  const T = useChatTheme();
  const styles = useMemo(() => mkStyles(T), [T]);
  const [tab, setTab] = useState('conversas'); // conversas | status | chamadas
  const [busca, setBusca] = useState('');
  const [conversas, setConversas] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [statusGroups, setStatusGroups] = useState([]);
  const [meuStatus, setMeuStatus] = useState(null);
  const [reqCount, setReqCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [convMenu, setConvMenu] = useState(null); // item alvo do long-press
  const [showRequests, setShowRequests] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [postMenu, setPostMenu] = useState(false);
  const [postando, setPostando] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, g, s, cr] = await Promise.all([
        blueAPI.conversas().catch(() => null),
        blueAPI.meusGrupos().catch(() => null),
        blueAPI.storiesFeed('status').catch(() => null),
        blueAPI.contatoRequests().catch(() => null),
      ]);
      setConversas(c?.conversations || []);
      setGrupos(g?.grupos || []);
      setStatusGroups((s?.users || []).filter((u) => Array.isArray(u.stories) && u.stories.length > 0));
      setMeuStatus(s?.meu && Array.isArray(s.meu.stories) && s.meu.stories.length ? s.meu : null);
      setReqCount((cr?.requests || []).length);
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

  // ── Postar status (foto/vídeo da galeria → audience 'status') ─────────────
  const postarStatus = async (tipo) => {
    setPostMenu(false);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: tipo === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      videoMaxDuration: 15,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setPostando(true);
    const r = await blueAPI.storyCriar(a.uri, {
      tipo: tipo === 'video' ? 'video' : 'imagem',
      mime: a.mimeType,
      audience: 'status',
    }).catch((e) => ({ error: e.message }));
    setPostando(false);
    if (r?.error) { Alert.alert('Não deu pra postar', r.error); return; }
    load();
  };

  const abrirMeuStatus = () => {
    if (meuStatus) nav.navigate('StoryViewer', { users: [meuStatus], startUserIndex: 0 });
    else setPostMenu(true);
  };

  const renderConversa = ({ item }) => {
    if (item.tipo === 'reqheader') {
      return (
        <TouchableOpacity style={styles.reqHeader} onPress={() => setShowRequests((v) => !v)}>
          <View style={styles.reqBell}><Ionicons name="notifications" size={16} color="#fff" /></View>
          <Text style={styles.reqTitle}>Novos contatos</Text>
          <View style={styles.reqBadge}><Text style={styles.reqBadgeText}>{item.count}</Text></View>
          <Ionicons name={showRequests ? 'chevron-up' : 'chevron-down'} size={16} color={T.textDim} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      );
    }
    return (
    <TouchableOpacity style={styles.item} onPress={() => abrir(item)} onLongPress={() => setConvMenu(item)} delayLongPress={350}>
      {item.tipo === 'grupo'
        ? <View style={styles.groupAv}><Ionicons name={themedIcon('people', T.icons)} size={22} color={T.accent} /></View>
        : <Avatar uri={item.raw.other?.avatar_url} initial={item.nome} size={50} />}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.nome}</Text>
        <Text style={styles.last} numberOfLines={1}>{item.sub}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={[styles.hora, item.unread > 0 && { color: T.accent }]}>{fmtHora(item.quando)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {item.raw.pinned ? <Ionicons name="pin" size={13} color={T.textDim} /> : null}
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
        <View style={[styles.statusRing, !vistos && { borderColor: T.accent }]}>
          <Avatar uri={item.avatar_url} initial={item.display_name || item.username} size={48} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>@{item.username}</Text>
          <Text style={styles.last}>{item.stories.length} status · {fmtHora(item.stories[item.stories.length - 1]?.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.background, paddingTop: insets.top }}>
      {/* Header: título + ⋮ */}
      <View style={styles.topbar}>
        <Text style={styles.title}>Blue<Text style={{ color: T.accent }}>Chat</Text></Text>
        <TouchableOpacity onPress={() => setMenuOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="ellipsis-vertical" size={22} color={T.text} />
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
          <Ionicons name="search" size={16} color={T.textDim} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar conversa…"
            placeholderTextColor={T.textDim}
            value={busca}
            onChangeText={setBusca}
          />
          {busca ? (
            <TouchableOpacity onPress={() => setBusca('')}><Ionicons name="close-circle" size={16} color={T.textDim} /></TouchableOpacity>
          ) : null}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={T.accent} style={{ marginTop: 40 }} />
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
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.accent} />}
            renderItem={renderConversa}
            contentContainerStyle={{ paddingBottom: 140 }}
          />
        )
      ) : tab === 'status' ? (
        <FlatList
          data={statusGroups}
          keyExtractor={(i) => i.user_id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.accent} />}
          renderItem={renderStatus}
          contentContainerStyle={{ paddingBottom: 140 }}
          ListHeaderComponent={
            <View>
              {/* Meu status */}
              <TouchableOpacity style={styles.item} onPress={abrirMeuStatus} disabled={postando}>
                <View style={styles.meuStatusAv}>
                  <View style={[styles.statusRing, meuStatus && { borderColor: T.accent }]}>
                    <Avatar uri={meuStatus?.avatar_url} initial={meuStatus?.display_name || 'Eu'} size={48} />
                  </View>
                  <View style={styles.plusBadge}><Ionicons name="add" size={13} color="#fff" /></View>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>Meu status</Text>
                  <Text style={styles.last}>
                    {postando ? 'Postando…' : meuStatus
                      ? `${meuStatus.stories.length} ativo${meuStatus.stories.length > 1 ? 's' : ''} · toque pra ver quem viu`
                      : 'Toque pra postar (some em 24h)'}
                  </Text>
                </View>
                {postando ? <ActivityIndicator size="small" color={T.accent} /> : null}
              </TouchableOpacity>
              {/* Aviso de privacidade do status */}
              <View style={styles.avisoBox}>
                <Ionicons name="lock-closed" size={13} color={T.accent} />
                <Text style={styles.avisoText}>
                  Seu status aparece <Text style={{ fontWeight: '800', color: T.text }}>apenas pra quem você adicionou</Text> nos contatos do BlueChat. Ele some em 24 horas. Quem vê pode curtir e responder — a resposta cai na sua conversa.
                </Text>
              </View>
              {statusGroups.length === 0 && (
                <View style={[styles.empty, { paddingTop: 30 }]}>
                  <Text style={styles.emptyIcon}>📸</Text>
                  <Text style={styles.emptyText}>Nenhum status dos seus contatos</Text>
                  <Text style={styles.emptySub}>Quando alguém que te adicionou postar, aparece aqui</Text>
                </View>
              )}
            </View>
          }
        />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📞</Text>
          <Text style={styles.emptyText}>Chamadas em breve</Text>
          <Text style={styles.emptySub}>Ligações de voz e vídeo estão chegando</Text>
        </View>
      )}

      {/* FAB: conversas = adicionar usuário · status = postar */}
      {tab === 'conversas' && (
        <TouchableOpacity style={styles.fab} onPress={() => setAddOpen(true)}>
          <Ionicons name={themedIcon('person-add', T.icons)} size={22} color="#fff" />
          {reqCount > 0 && <View style={styles.fabBadge}><Text style={styles.fabBadgeText}>{reqCount}</Text></View>}
        </TouchableOpacity>
      )}
      {tab === 'status' && (
        <TouchableOpacity style={styles.fab} onPress={() => setPostMenu(true)} disabled={postando}>
          <Ionicons name={themedIcon('camera', T.icons)} size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Menu ⋮ */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menuCard, { top: insets.top + 44 }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); setAddOpen(true); }}>
              <Text style={styles.menuText}>Adicionar usuário{reqCount > 0 ? `  🔴 ${reqCount}` : ''}</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); nav.navigate('CriarGrupo'); }}>
              <Text style={styles.menuText}>Novo grupo</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); nav.navigate('Temas'); }}>
              <Text style={styles.menuText}>Temas do BlueChat</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Popup adicionar usuário (aceite mútuo) */}
      <AddContactSheet visible={addOpen} onClose={() => { setAddOpen(false); load(); }} onChanged={load} />

      {/* Menu de postar status */}
      <GlassMenu
        visible={postMenu}
        title="Postar no status (some em 24h)"
        options={[
          { icon: 'image-outline', label: 'Foto da galeria', onPress: () => postarStatus('imagem') },
          { icon: 'videocam-outline', label: 'Vídeo (até 15s)', onPress: () => postarStatus('video') },
        ]}
        onClose={() => setPostMenu(false)}
      />

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

const mkStyles = (T) => StyleSheet.create({
  reqHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginBottom: 6, padding: 12, borderRadius: 14, backgroundColor: T.card, borderWidth: 1, borderColor: T.border },
  reqBell: { width: 28, height: 28, borderRadius: 14, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  reqTitle: { color: T.text, fontSize: 14, fontWeight: '700', fontFamily: T.font },
  reqBadge: { backgroundColor: '#ff4757', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  reqBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  title: { color: T.text, fontSize: 20, fontWeight: '800', fontFamily: T.font },
  tabs: { flexDirection: 'row', paddingHorizontal: 10, gap: 6, marginBottom: 8 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 100, alignItems: 'center', backgroundColor: T.card },
  tabBtnActive: { backgroundColor: T.accent + '26' },
  tabText: { color: T.textSecondary, fontSize: 13, fontWeight: '600', fontFamily: T.font },
  tabTextActive: { color: T.accent, fontWeight: '800' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.input, borderRadius: 12, marginHorizontal: 12, marginBottom: 6, paddingHorizontal: 12 },
  searchInput: { flex: 1, paddingVertical: 9, color: T.text, fontSize: 13, fontFamily: T.font },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: T.text, fontSize: 15, fontWeight: '600', fontFamily: T.font },
  emptySub: { color: T.textSecondary, fontSize: 12, textAlign: 'center', fontFamily: T.font },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: T.border },
  groupAv: { width: 50, height: 50, borderRadius: 25, backgroundColor: T.accent + '1f', alignItems: 'center', justifyContent: 'center' },
  statusRing: { padding: 2, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(150,150,150,0.3)' },
  meuStatusAv: { position: 'relative' },
  plusBadge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: T.background },
  avisoBox: { flexDirection: 'row', gap: 8, marginHorizontal: 12, marginVertical: 8, padding: 12, borderRadius: 12, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, alignItems: 'flex-start' },
  avisoText: { flex: 1, color: T.textSecondary, fontSize: 12, lineHeight: 17, fontFamily: T.font },
  info: { flex: 1 },
  name: { color: T.text, fontSize: 14, fontWeight: '700', marginBottom: 2, fontFamily: T.font },
  last: { color: T.textSecondary, fontSize: 12, fontFamily: T.font },
  meta: { alignItems: 'flex-end', gap: 4 },
  hora: { color: T.textDim, fontSize: 11 },
  badge: { backgroundColor: T.accent, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  fab: { position: 'absolute', right: 18, bottom: 96, width: 54, height: 54, borderRadius: 27, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  fabBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#ff4757', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: T.background },
  fabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  menuCard: { position: 'absolute', right: 12, backgroundColor: T.mode === 'light' ? '#fff' : '#0a1020', borderRadius: 12, borderWidth: 1, borderColor: T.border, minWidth: 200, overflow: 'hidden' },
  menuItem: { paddingHorizontal: 16, paddingVertical: 13 },
  menuText: { color: T.text, fontSize: 14, fontFamily: T.font },
  menuDivider: { height: 1, backgroundColor: T.border },
});
