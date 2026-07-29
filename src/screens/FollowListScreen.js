// Seguidores / Seguindo — lista de quem é quem (user 2026-07-29).
// Antes os números do perfil não abriam nada: não dava pra ver quem seguia.
//
// Privacidade (regra do dono): a MINHA lista eu sempre vejo; a de outra
// pessoa só aparece se ela me adicionou nos contatos do BlueChat. Quem decide
// é o backend (blue-follow) — aqui a tela só trata `bloqueado: true`.
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import blueAPI from '../api';
import { COLORS } from '../constants';

const ABAS = [
  { key: 'seguidores', label: 'Seguidores' },
  { key: 'seguindo', label: 'Seguindo' },
];

export default function FollowListScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const {
    user_id: userId,
    username,
    tab: tabInicial = 'seguidores',
    isMe = false,
  } = route.params || {};

  const [tab, setTab] = useState(tabInicial === 'seguindo' ? 'seguindo' : 'seguidores');
  const [usuarios, setUsuarios] = useState([]);
  const [total, setTotal] = useState(0);
  const [bloqueado, setBloqueado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const paginaRef = useRef(1);
  const temMaisRef = useRef(true);

  const carregar = useCallback(async (reset = true) => {
    if (!userId) { setLoading(false); return; }
    if (reset) { paginaRef.current = 1; temMaisRef.current = true; }
    const pagina = paginaRef.current;
    try {
      const fn = tab === 'seguindo' ? blueAPI.listaSeguindo : blueAPI.listaSeguidores;
      const d = await fn(userId, pagina);
      const lista = Array.isArray(d?.usuarios) ? d.usuarios.filter((u) => u && u.user_id) : [];
      setBloqueado(!!d?.bloqueado);
      setTotal(Number(d?.total) || 0);
      setUsuarios((prev) => {
        if (reset) return lista;
        const vistos = new Set(prev.map((u) => u.user_id));
        return [...prev, ...lista.filter((u) => !vistos.has(u.user_id))];
      });
      temMaisRef.current = pagina < (Number(d?.total_paginas) || 1);
    } catch (e) {
      if (reset) { setUsuarios([]); setTotal(0); }
    }
    setLoading(false);
    setRefreshing(false);
    setCarregandoMais(false);
  }, [userId, tab]);

  useEffect(() => { setLoading(true); carregar(true); }, [carregar]);

  const carregarMais = () => {
    if (carregandoMais || loading || bloqueado || !temMaisRef.current) return;
    setCarregandoMais(true);
    paginaRef.current += 1;
    carregar(false);
  };

  const trocarAba = (k) => {
    if (k === tab) return;
    setUsuarios([]);
    setTotal(0);
    setBloqueado(false);
    setLoading(true);
    setTab(k);
  };

  const renderItem = ({ item: u }) => (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => nav.push('PerfilUsuario', { user_id: u.user_id })}>
      <Avatar uri={u.avatar_url} initial={u.display_name || u.username} size={46} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.nomeLinha}>
          <Text style={styles.username} numberOfLines={1}>@{String(u.username || '')}</Text>
          {u.verificado ? <Ionicons name="checkmark-circle" size={14} color={COLORS.neon} /> : null}
        </View>
        {u.display_name ? (
          <Text style={styles.display} numberOfLines={1}>{String(u.display_name)}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />
    </TouchableOpacity>
  );

  const vazioTexto = tab === 'seguindo'
    ? (isMe ? 'Você ainda não segue ninguém' : 'Ainda não segue ninguém')
    : (isMe ? 'Você ainda não tem seguidores' : 'Ainda não tem seguidores');

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header title={username ? `@${username}` : 'Conexões'} showBack />

      <View style={styles.abas}>
        {ABAS.map((a) => (
          <TouchableOpacity
            key={a.key}
            style={[styles.aba, tab === a.key && styles.abaAtiva]}
            onPress={() => trocarAba(a.key)}>
            <Text style={[styles.abaTexto, tab === a.key && styles.abaTextoAtivo]}>
              {a.label}{tab === a.key && total ? ` · ${total}` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.neon} style={{ marginTop: 40 }} />
      ) : bloqueado ? (
        <View style={styles.vazio}>
          <Text style={styles.vazioIcone}>🔒</Text>
          <Text style={styles.vazioTexto}>Lista privada</Text>
          <Text style={styles.vazioDica}>
            Só quem @{String(username || 'essa pessoa')} adicionou nos contatos do BlueChat pode ver
            quem {tab === 'seguindo' ? 'ela segue' : 'a segue'}.
          </Text>
          {total ? <Text style={styles.vazioTotal}>{total} no total</Text> : null}
        </View>
      ) : (
        <FlatList
          data={usuarios}
          keyExtractor={(u) => String(u.user_id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 120 }}
          onEndReached={carregarMais}
          onEndReachedThreshold={0.6}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); carregar(true); }}
              tintColor={COLORS.neon}
            />
          }
          ListEmptyComponent={
            <View style={styles.vazio}>
              <Text style={styles.vazioIcone}>👥</Text>
              <Text style={styles.vazioTexto}>{vazioTexto}</Text>
            </View>
          }
          ListFooterComponent={
            carregandoMais ? <ActivityIndicator color={COLORS.neon} style={{ marginVertical: 16 }} /> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  abas: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  aba: {
    flex: 1, paddingVertical: 9, borderRadius: 100, alignItems: 'center',
    backgroundColor: COLORS.chipBg, borderWidth: 1, borderColor: 'transparent',
  },
  abaAtiva: { borderColor: COLORS.neon, backgroundColor: COLORS.chipBg },
  abaTexto: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  abaTextoAtivo: { color: COLORS.neon, fontWeight: '800' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  nomeLinha: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  username: { color: COLORS.text, fontSize: 14.5, fontWeight: '700' },
  display: { color: COLORS.textSecondary, fontSize: 12.5, marginTop: 1 },
  vazio: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 34, gap: 8 },
  vazioIcone: { fontSize: 40 },
  vazioTexto: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  vazioDica: { color: COLORS.textSecondary, fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
  vazioTotal: { color: COLORS.textDim, fontSize: 12, marginTop: 4 },
});
