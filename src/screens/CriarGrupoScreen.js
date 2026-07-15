// Criar grupo estilo WhatsApp: nome + seleção de membros.
// Contatos = pessoas com quem você já conversou + busca por @username.
import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import blueAPI from '../api';
import { COLORS } from '../constants';

export default function CriarGrupoScreen({ navigation }) {
  const [nome, setNome] = useState('');
  const [busca, setBusca] = useState('');
  const [contatos, setContatos] = useState([]);
  const [buscados, setBuscados] = useState([]);
  const [sel, setSel] = useState({}); // { user_id: profile }
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    blueAPI.conversas().then((d) => {
      const uniq = {};
      (d?.conversations || []).forEach((c) => { if (c.other?.user_id) uniq[c.other.user_id] = c.other; });
      setContatos(Object.values(uniq));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Busca por @username (adiciona gente fora dos contatos)
  useEffect(() => {
    const q = busca.trim().replace(/^@/, '').toLowerCase();
    if (q.length < 3) { setBuscados([]); return; }
    const t = setTimeout(async () => {
      const d = await blueAPI.perfilPorUsername(q).catch(() => null);
      const p = d?.profile || d;
      setBuscados(p?.user_id ? [p] : []);
    }, 400);
    return () => clearTimeout(t);
  }, [busca]);

  const toggle = (p) => {
    setSel((s) => {
      const n = { ...s };
      if (n[p.user_id]) delete n[p.user_id]; else n[p.user_id] = p;
      return n;
    });
  };

  const criar = async () => {
    const n = nome.trim();
    if (!n) { Alert.alert('Nome do grupo', 'Dá um nome pro grupo primeiro.'); return; }
    const membros = Object.keys(sel);
    if (!membros.length) { Alert.alert('Membros', 'Escolhe pelo menos 1 pessoa.'); return; }
    setCriando(true);
    const r = await blueAPI.criarGrupo(n, membros).catch((e) => ({ error: e.message }));
    setCriando(false);
    if (r?.error || !r?.grupo) { Alert.alert('Erro', r?.error || 'Não deu pra criar o grupo.'); return; }
    navigation.replace('Conversa', { grupo: r.grupo });
  };

  const selecionados = Object.values(sel);
  const listaBase = busca.trim().length >= 3 ? buscados : contatos;
  const lista = listaBase.filter((p) =>
    !busca.trim() || busca.trim().length >= 3 ||
    (p.username || '').toLowerCase().includes(busca.trim().toLowerCase()) ||
    (p.display_name || '').toLowerCase().includes(busca.trim().toLowerCase()));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header title="Novo grupo" showBack />

      <View style={styles.nameWrap}>
        <View style={styles.groupAv}><Ionicons name="people" size={22} color={COLORS.neon} /></View>
        <TextInput
          style={styles.nameInput}
          placeholder="Nome do grupo"
          placeholderTextColor={COLORS.textDim}
          value={nome}
          onChangeText={setNome}
          maxLength={50}
        />
      </View>

      {selecionados.length > 0 && (
        <View style={styles.selRow}>
          {selecionados.map((p) => (
            <TouchableOpacity key={p.user_id} style={styles.chip} onPress={() => toggle(p)}>
              <Text style={styles.chipText}>@{p.username}</Text>
              <Ionicons name="close" size={12} color={COLORS.neon} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={COLORS.textDim} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar contato ou @username…"
          placeholderTextColor={COLORS.textDim}
          value={busca}
          onChangeText={setBusca}
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.neon} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(p) => p.user_id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: p }) => (
            <TouchableOpacity style={styles.item} onPress={() => toggle(p)}>
              <Avatar uri={p.avatar_url} initial={p.display_name || p.username} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{p.display_name || p.username}</Text>
                <Text style={styles.user}>@{p.username}</Text>
              </View>
              <Ionicons
                name={sel[p.user_id] ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={sel[p.user_id] ? COLORS.neon : COLORS.textDim}
              />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {busca.trim().length >= 3 ? 'Ninguém encontrado com esse @' : 'Converse com alguém primeiro — seus contatos aparecem aqui. Ou busque por @username.'}
            </Text>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <TouchableOpacity style={[styles.criarBtn, (!nome.trim() || !selecionados.length) && { opacity: 0.5 }]} onPress={criar} disabled={criando}>
        {criando ? <ActivityIndicator color="#fff" /> : <Text style={styles.criarText}>Criar grupo ({selecionados.length})</Text>}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  nameWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  groupAv: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(0,170,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  nameInput: { flex: 1, borderBottomWidth: 1, borderBottomColor: COLORS.border, color: COLORS.text, fontSize: 16, paddingVertical: 8 },
  selRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,170,255,0.1)', borderRadius: 100, paddingVertical: 4, paddingHorizontal: 10 },
  chipText: { color: COLORS.neon, fontSize: 12, fontWeight: '700' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: 12, marginHorizontal: 12, marginBottom: 6, paddingHorizontal: 12 },
  searchInput: { flex: 1, paddingVertical: 9, color: COLORS.text, fontSize: 13 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  name: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  user: { color: COLORS.textSecondary, fontSize: 12 },
  empty: { color: COLORS.textSecondary, textAlign: 'center', padding: 30, fontSize: 13, lineHeight: 20 },
  criarBtn: { position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: COLORS.neon, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  criarText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
