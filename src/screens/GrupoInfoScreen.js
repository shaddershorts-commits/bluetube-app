// GrupoInfoScreen — dados do grupo estilo WhatsApp: foto, nome e descrição
// (admins editam), toggle "só admins enviam", lista de membros com papéis
// (promover/rebaixar/remover — admin), sair do grupo e excluir (criador).
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Image, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import GlassMenu from '../components/GlassMenu';
import blueAPI from '../api';
import { useAuthStore } from '../store';
import { COLORS } from '../constants';

export default function GrupoInfoScreen({ route }) {
  const { grupo } = route.params || {};
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const myId = useAuthStore((s) => s.user?.id);

  const [nome, setNome] = useState(grupo?.nome || '');
  const [descricao, setDescricao] = useState(grupo?.descricao || '');
  const [avatarUrl, setAvatarUrl] = useState(grupo?.avatar_url || null);
  const [onlyAdmins, setOnlyAdmins] = useState(!!grupo?.only_admins);
  const [membros, setMembros] = useState([]);
  const [saving, setSaving] = useState(false);
  const [membroMenu, setMembroMenu] = useState(null);

  const souCriador = grupo?.criador_id === myId;
  const meuRole = membros.find((m) => m.user_id === myId)?.role || 'membro';
  const souAdmin = meuRole === 'admin' || souCriador;

  const load = useCallback(async () => {
    const d = await blueAPI.grupoMembros(grupo.id).catch(() => null);
    setMembros(d?.membros || []);
  }, [grupo?.id]);
  useEffect(() => { load(); }, [load]);

  const trocarFoto = async () => {
    if (!souAdmin) return;
    // Photo Picker do sistema — sem permissão de galeria
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (res.canceled || !res.assets?.length) return;
    try {
      const up = await blueAPI.uploadChatMedia(res.assets[0].uri, { ext: 'jpg', mime: 'image/jpeg' });
      if (up?.url) {
        setAvatarUrl(up.url);
        await blueAPI.grupoEditar(grupo.id, { avatar_url: up.url });
      }
    } catch (e) { Alert.alert('Erro', 'Não deu pra trocar a foto.'); }
  };

  const salvar = async () => {
    setSaving(true);
    const r = await blueAPI.grupoEditar(grupo.id, { nome, descricao }).catch((e) => ({ error: e.message }));
    setSaving(false);
    if (r?.error) Alert.alert('Não salvou', r.error);
    else Alert.alert('Salvo!', 'Dados do grupo atualizados.');
  };

  const toggleOnlyAdmins = async () => {
    const r = await blueAPI.grupoOnlyAdmins(grupo.id).catch((e) => ({ error: e.message }));
    if (r?.error) { Alert.alert('Erro', r.error); return; }
    setOnlyAdmins(!!r.only_admins);
  };

  const sair = () => Alert.alert('Sair do grupo?', 'Você deixará de receber as mensagens.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Sair', style: 'destructive', onPress: async () => { await blueAPI.grupoSair(grupo.id).catch(() => {}); nav.reset({ index: 0, routes: [{ name: 'Main' }] }); } },
  ]);

  const excluir = () => Alert.alert('Excluir grupo?', 'Apaga o grupo e TODAS as mensagens pra todo mundo. Irreversível.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'EXCLUIR', style: 'destructive', onPress: async () => {
      const r = await blueAPI.grupoExcluir(grupo.id).catch((e) => ({ error: e.message }));
      if (r?.error) Alert.alert('Erro', r.error);
      else nav.reset({ index: 0, routes: [{ name: 'Main' }] });
    } },
  ]);

  const membroOptions = () => {
    const m = membroMenu;
    if (!m || !souAdmin || m.user_id === myId) return [];
    const ehCriador = m.user_id === grupo?.criador_id;
    return [
      m.role !== 'admin'
        ? { icon: 'shield-checkmark-outline', label: 'Promover a admin', onPress: async () => { await blueAPI.grupoSetRole(grupo.id, m.user_id, 'admin').catch(() => {}); load(); } }
        : (!ehCriador ? { icon: 'shield-outline', label: 'Remover admin', onPress: async () => { await blueAPI.grupoSetRole(grupo.id, m.user_id, 'membro').catch(() => {}); load(); } } : null),
      !ehCriador ? { icon: 'person-remove-outline', label: 'Remover do grupo', danger: true, onPress: async () => { await blueAPI.grupoRemoverMembro(grupo.id, m.user_id).catch(() => {}); load(); } } : null,
    ].filter(Boolean);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Dados do grupo</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        {/* Foto */}
        <TouchableOpacity style={styles.avatarWrap} onPress={trocarFoto} activeOpacity={souAdmin ? 0.7 : 1}>
          {avatarUrl
            ? <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            : <View style={[styles.avatar, styles.avatarEmpty]}><Ionicons name="people" size={40} color={COLORS.neon} /></View>}
          {souAdmin ? <View style={styles.camBadge}><Ionicons name="camera" size={14} color="#fff" /></View> : null}
        </TouchableOpacity>

        {/* Nome + descrição */}
        <Text style={styles.label}>Nome do grupo</Text>
        <TextInput style={styles.input} value={nome} onChangeText={setNome} editable={souAdmin} maxLength={60} placeholder="Nome" placeholderTextColor={COLORS.textDim} />
        <Text style={styles.label}>Descrição (visível pra todos os membros)</Text>
        <TextInput style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]} value={descricao} onChangeText={setDescricao} editable={souAdmin} maxLength={300} multiline placeholder="Sobre o grupo…" placeholderTextColor={COLORS.textDim} />
        {souAdmin ? (
          <TouchableOpacity style={styles.saveBtn} onPress={salvar} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Salvar alterações</Text>}
          </TouchableOpacity>
        ) : null}

        {/* Só admins enviam */}
        {souAdmin ? (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Só admins enviam mensagens</Text>
              <Text style={styles.rowSub}>Membros só leem (estilo avisos do WhatsApp)</Text>
            </View>
            <Switch value={onlyAdmins} onValueChange={toggleOnlyAdmins} trackColor={{ true: COLORS.primary }} />
          </View>
        ) : (onlyAdmins ? <Text style={styles.rowSub}>🔒 Só admins enviam mensagens neste grupo</Text> : null)}

        {/* Membros */}
        <Text style={[styles.label, { marginTop: 22 }]}>{membros.length} membros{souAdmin ? ' · toque e segure pra gerenciar' : ''}</Text>
        {membros.map((m) => (
          <TouchableOpacity key={m.user_id} style={styles.membro} onLongPress={() => souAdmin && setMembroMenu(m)} delayLongPress={350}
            onPress={() => nav.navigate('PerfilUsuario', { user_id: m.user_id })}>
            <Avatar uri={m.profile?.avatar_url} initial={m.profile?.display_name || m.profile?.username} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.membroNome} numberOfLines={1}>@{m.profile?.username || 'usuário'}{m.user_id === myId ? ' (você)' : ''}</Text>
            </View>
            {m.role === 'admin' ? <View style={styles.admBadge}><Text style={styles.admText}>{m.user_id === grupo?.criador_id ? 'criador' : 'admin'}</Text></View> : null}
          </TouchableOpacity>
        ))}

        {/* Sair / excluir */}
        <TouchableOpacity style={styles.dangerBtn} onPress={sair}>
          <Ionicons name="exit-outline" size={18} color="#f87171" />
          <Text style={styles.dangerText}>Sair do grupo</Text>
        </TouchableOpacity>
        {souCriador ? (
          <TouchableOpacity style={styles.dangerBtn} onPress={excluir}>
            <Ionicons name="trash-outline" size={18} color="#f87171" />
            <Text style={styles.dangerText}>Excluir grupo</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <GlassMenu
        visible={!!membroMenu}
        title={membroMenu ? '@' + (membroMenu.profile?.username || 'membro') : ''}
        options={membroOptions()}
        onClose={() => setMembroMenu(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  topTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  avatarWrap: { alignSelf: 'center', marginBottom: 18 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarEmpty: { backgroundColor: 'rgba(0,170,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  camBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.background },
  label: { color: COLORS.textDim, fontSize: 11.5, marginBottom: 6, marginTop: 12, letterSpacing: 0.3 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(0,170,255,0.15)', borderRadius: 12, color: COLORS.text, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(0,170,255,0.1)' },
  rowTitle: { color: COLORS.text, fontSize: 13.5, fontWeight: '700' },
  rowSub: { color: COLORS.textDim, fontSize: 11.5, marginTop: 2 },
  membro: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  membroNome: { color: COLORS.text, fontSize: 13.5, fontWeight: '600' },
  admBadge: { backgroundColor: 'rgba(0,170,255,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  admText: { color: COLORS.neon, fontSize: 10.5, fontWeight: '700' },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(248,113,113,0.35)', backgroundColor: 'rgba(248,113,113,0.05)' },
  dangerText: { color: '#f87171', fontSize: 14, fontWeight: '700' },
});
