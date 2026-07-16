import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import Avatar from '../components/Avatar';
import blueAPI from '../api';
import { useAuthStore } from '../store';
import { COLORS } from '../constants';

const MAX_NAME = 50;
const MAX_USER = 30;
const MAX_BIO = 150;

function sanitizeUsername(v) {
  return (v || '').toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, MAX_USER);
}

export default function EditProfileScreen() {
  const nav = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Exclusão de conta (Google Play): dupla confirmação, aviso conta única
  const confirmarExclusao = () => {
    Alert.alert(
      'Excluir sua conta?',
      'Sua conta é ÚNICA para o app e o site bluetubeviral.com. Excluir apaga permanentemente: perfil, vídeos, comentários, mensagens e curtidas. Isso NÃO pode ser desfeito.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar', style: 'destructive',
          onPress: () => Alert.alert('Última confirmação', 'Excluir tudo agora, de forma definitiva?', [
            { text: 'Voltar', style: 'cancel' },
            { text: 'EXCLUIR MINHA CONTA', style: 'destructive', onPress: executarExclusao },
          ]),
        },
      ],
    );
  };

  const executarExclusao = async () => {
    setDeleting(true);
    const r = await blueAPI.deleteAccount().catch((e) => ({ error: e.message }));
    setDeleting(false);
    if (r?.active_subscription) {
      Alert.alert('Assinatura ativa', 'Cancele sua assinatura primeiro (no site: Perfil → Gerenciar assinatura) e depois volte aqui pra excluir a conta.');
      return;
    }
    if (r?.error) { Alert.alert('Não foi possível excluir', r.error); return; }
    await useAuthStore.getState().logout();
    Alert.alert('Conta excluída', 'Sua conta e seus dados foram removidos. Até logo! 👋');
    nav.reset({ index: 0, routes: [{ name: 'Main' }] });
  };
  const [original, setOriginal] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [avatarUri, setAvatarUri] = useState(null);   // URI local (novo avatar)
  const [avatarRemote, setAvatarRemote] = useState(null); // URL remota (perfil atual)

  useEffect(() => {
    (async () => {
      const r = await blueAPI.meuPerfil();
      const p = r?.profile || r || {};
      setOriginal(p);
      setDisplayName(p.display_name || '');
      setUsername(p.username || '');
      setBio(p.bio || '');
      setLinkUrl(p.link_url || '');
      setLinkLabel(p.link_label || '');
      setAvatarRemote(p.avatar_url || null);
      setLoading(false);
    })();
  }, []);

  const pickAvatar = async () => {
    // Photo Picker do sistema — sem permissão de galeria
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: false,
    });
    if (!res.canceled && res.assets?.[0]) {
      setAvatarUri(res.assets[0].uri);
    }
  };

  const save = async () => {
    if (!original) return;
    const dn = displayName.trim().slice(0, MAX_NAME);
    const un = sanitizeUsername(username);
    const b = bio.trim().slice(0, MAX_BIO);

    if (un.length > 0 && un.length < 3) {
      Alert.alert('Username inválido', 'Precisa ter no mínimo 3 caracteres (letras, números, _ ou .).');
      return;
    }

    const patch = {};
    if (dn !== (original.display_name || '')) patch.display_name = dn;
    if (b !== (original.bio || '')) patch.bio = b;
    if (un && un !== (original.username || '')) patch.username = un;
    // Link estilo Instagram (URL + nome de exibicao)
    const lu = linkUrl.trim().slice(0, 200);
    const ll = linkLabel.trim().slice(0, 40);
    if (lu !== (original.link_url || '')) patch.link_url = lu;
    if (ll !== (original.link_label || '')) patch.link_label = ll;

    // Avatar — converte local pra base64 só se mudou
    if (avatarUri) {
      try {
        const b64 = await FileSystem.readAsStringAsync(avatarUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        patch.avatar_data = `data:image/jpeg;base64,${b64}`;
      } catch (e) {
        Alert.alert('Erro', 'Não consegui ler a foto escolhida.');
        return;
      }
    }

    if (Object.keys(patch).length === 0) {
      nav.goBack();
      return;
    }

    setSaving(true);
    try {
      const r = await blueAPI.atualizarPerfil(patch);
      if (r?.error) throw new Error(r.error);
      Alert.alert('Perfil atualizado', '', [{ text: 'OK', onPress: () => nav.goBack() }]);
    } catch (e) {
      Alert.alert('Erro ao salvar', e.message || 'Tenta de novo em alguns segundos.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={COLORS.neon} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity onPress={() => !saving && nav.goBack()} disabled={saving}>
          <Ionicons name="close" color="#fff" size={26} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar perfil</Text>
        <TouchableOpacity onPress={save} disabled={saving}>
          <Text style={[styles.saveBtn, saving && styles.saveBtnDisabled]}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarWrap}>
          <TouchableOpacity onPress={pickAvatar} disabled={saving} activeOpacity={0.8}>
            <Avatar
              uri={avatarUri || avatarRemote}
              initial={displayName || username}
              size={104}
            />
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" color="#fff" size={14} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Toca no avatar pra alterar</Text>
        </View>

        <Field
          label="Nome"
          value={displayName}
          onChange={(v) => setDisplayName(v.slice(0, MAX_NAME))}
          placeholder="Como você quer aparecer no app"
          max={MAX_NAME}
          disabled={saving}
        />

        <Field
          label="Username"
          value={username}
          onChange={(v) => setUsername(sanitizeUsername(v))}
          placeholder="letras, números, _ ou ."
          max={MAX_USER}
          autoCapitalize="none"
          disabled={saving}
          helper="aparece como @username no perfil"
        />

        <Field
          label="Bio"
          value={bio}
          onChange={(v) => setBio(v.slice(0, MAX_BIO))}
          placeholder="Uma linha sobre você"
          max={MAX_BIO}
          multiline
          disabled={saving}
        />

        <Field
          label="Link"
          value={linkUrl}
          onChange={(v) => setLinkUrl(v.slice(0, 200))}
          placeholder="seusite.com ou instagram.com/voce"
          max={200}
          autoCapitalize="none"
          disabled={saving}
          helper="aparece como botão clicável no seu perfil"
        />

        <Field
          label="Nome do link"
          value={linkLabel}
          onChange={(v) => setLinkLabel(v.slice(0, 40))}
          placeholder="ex.: Meu Instagram"
          max={40}
          disabled={saving}
        />

        <Text style={styles.footer}>
          Quer mudar email ou senha? Use o site em bluetubeviral.com.
        </Text>

        {/* Zona de perigo — exclusão de conta (exigência Google Play) */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>ZONA DE PERIGO</Text>
          <TouchableOpacity style={styles.deleteBtn} onPress={confirmarExclusao} disabled={deleting}>
            {deleting
              ? <ActivityIndicator color="#f87171" size="small" />
              : <Text style={styles.deleteText}>🗑️ Excluir conta permanentemente</Text>}
          </TouchableOpacity>
          <Text style={styles.dangerHint}>
            Apaga sua conta BlueTube inteira (app e site): vídeos, comentários, mensagens e perfil. Irreversível.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange, placeholder, max, multiline, disabled, autoCapitalize, helper }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textDim}
        maxLength={max}
        multiline={!!multiline}
        numberOfLines={multiline ? 3 : 1}
        autoCapitalize={autoCapitalize}
        editable={!disabled}
      />
      <View style={styles.fieldFoot}>
        {helper ? <Text style={styles.helper}>{helper}</Text> : <View />}
        <Text style={styles.counter}>{value.length}/{max}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  saveBtn: { color: COLORS.neon, fontSize: 15, fontWeight: '800', paddingHorizontal: 8 },
  saveBtnDisabled: { color: COLORS.textDim },
  body: { padding: 18, paddingBottom: 48, gap: 18 },
  avatarWrap: { alignItems: 'center', gap: 10, marginBottom: 6 },
  avatarBadge: {
    position: 'absolute',
    right: -2, bottom: -2,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.background,
  },
  avatarHint: { color: COLORS.textDim, fontSize: 12 },
  fieldGroup: { gap: 6 },
  label: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  fieldFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  helper: { color: COLORS.textDim, fontSize: 11, flex: 1 },
  counter: { color: COLORS.textDim, fontSize: 11 },
  dangerZone: { marginTop: 28, borderTopWidth: 1, borderTopColor: 'rgba(248,113,113,0.2)', paddingTop: 18 },
  dangerTitle: { color: '#f87171', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12, textAlign: 'center' },
  deleteBtn: { borderWidth: 1, borderColor: 'rgba(248,113,113,0.45)', borderRadius: 12, paddingVertical: 13, alignItems: 'center', backgroundColor: 'rgba(248,113,113,0.06)' },
  deleteText: { color: '#f87171', fontSize: 14, fontWeight: '700' },
  dangerHint: { color: COLORS.textDim, fontSize: 11, textAlign: 'center', marginTop: 10, lineHeight: 16 },
  footer: {
    color: COLORS.textDim,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 8,
  },
});
