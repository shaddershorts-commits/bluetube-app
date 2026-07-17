// AddContactSheet — popup do BlueChat pra adicionar usuários (estilo WhatsApp).
// Substitui o FAB antigo de "novo grupo" (que duplicava o menu ⋮).
// Mostra: solicitações pendentes (aceitar/recusar) + busca por @username
// + lista de contatos já adicionados. Pra adicionar, o outro precisa aceitar.
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Avatar from './Avatar';
import blueAPI from '../api';
import { COLORS } from '../constants';

export default function AddContactSheet({ visible, onClose, onChanged }) {
  const [busca, setBusca] = useState('');
  const [contatos, setContatos] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, r] = await Promise.all([
      blueAPI.contatosList().catch(() => null),
      blueAPI.contatoRequests().catch(() => null),
    ]);
    setContatos(c?.contatos || []);
    setRequests(r?.requests || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (visible) load(); }, [visible, load]);

  const enviar = async () => {
    const un = busca.trim().replace(/^@/, '');
    if (un.length < 3) { Alert.alert('Username', 'Digite o @username completo de quem você quer adicionar.'); return; }
    setEnviando(true);
    const r = await blueAPI.contatoRequest(un).catch((e) => ({ error: e.message }));
    setEnviando(false);
    if (r?.error) { Alert.alert('Não deu', r.error); return; }
    setBusca('');
    Alert.alert('Solicitação enviada! ✓', `@${r.para || un} vai receber seu pedido e precisa aceitar.`);
  };

  const aceitar = async (u) => {
    setRequests((l) => l.filter((x) => x.user_id !== u.user_id));
    const r = await blueAPI.contatoAccept(u.user_id).catch(() => null);
    if (r?.ok) { load(); onChanged && onChanged(); }
  };

  const recusar = async (u) => {
    setRequests((l) => l.filter((x) => x.user_id !== u.user_id));
    await blueAPI.contatoReject(u.user_id).catch(() => {});
  };

  const renderItem = ({ item }) => {
    if (item._tipo === 'header') {
      return <Text style={styles.section}>{item.label}</Text>;
    }
    if (item._tipo === 'request') {
      return (
        <View style={styles.row}>
          <Avatar uri={item.avatar_url} initial={item.display_name || item.username} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.nome} numberOfLines={1}>{item.display_name || item.username}</Text>
            <Text style={styles.sub} numberOfLines={1}>@{item.username} quer te adicionar</Text>
          </View>
          <TouchableOpacity style={styles.btnOk} onPress={() => aceitar(item)}>
            <Ionicons name="checkmark" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnNo} onPress={() => recusar(item)}>
            <Ionicons name="close" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.row}>
        <Avatar uri={item.avatar_url} initial={item.display_name || item.username} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={styles.nome} numberOfLines={1}>{item.display_name || item.username}</Text>
          <Text style={styles.sub} numberOfLines={1}>@{item.username}</Text>
        </View>
        <Ionicons name="people" size={16} color={COLORS.textDim} />
      </View>
    );
  };

  const data = [
    ...(requests.length ? [{ _tipo: 'header', id: 'h1', label: `Solicitações (${requests.length})` }] : []),
    ...requests.map((r) => ({ ...r, _tipo: 'request', id: 'r_' + r.user_id })),
    { _tipo: 'header', id: 'h2', label: contatos.length ? `Seus contatos (${contatos.length})` : 'Seus contatos' },
    ...contatos.map((c) => ({ ...c, _tipo: 'contato', id: 'c_' + c.user_id })),
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheetWrap}>
        <BlurView intensity={50} tint="dark" style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Adicionar usuário</Text>

          <View style={styles.searchWrap}>
            <Ionicons name="at" size={16} color={COLORS.textDim} />
            <TextInput
              style={styles.searchInput}
              placeholder="username de quem quer adicionar"
              placeholderTextColor={COLORS.textDim}
              autoCapitalize="none"
              autoCorrect={false}
              value={busca}
              onChangeText={setBusca}
              onSubmitEditing={enviar}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={enviar} disabled={enviando}>
              {enviando ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="person-add" size={16} color="#fff" />}
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.neon} style={{ marginTop: 30 }} />
          ) : (
            <FlatList
              data={data}
              keyExtractor={(i) => i.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 30 }}
              ListEmptyComponent={<Text style={styles.empty}>Nenhum contato ainda — envie a primeira solicitação. 🙂</Text>}
            />
          )}
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '78%', borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden' },
  sheet: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, backgroundColor: 'rgba(4,11,26,0.9)' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 12 },
  title: { color: COLORS.text, fontSize: 17, fontWeight: '800', marginBottom: 12 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingLeft: 12, paddingRight: 6, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, paddingVertical: 10, color: COLORS.text, fontSize: 14 },
  sendBtn: { backgroundColor: COLORS.primary, borderRadius: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  section: { color: COLORS.textDim, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginTop: 12, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  nome: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  sub: { color: COLORS.textSecondary, fontSize: 12 },
  btnOk: { backgroundColor: COLORS.success, borderRadius: 18, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  btnNo: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  empty: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 24, lineHeight: 20 },
});
