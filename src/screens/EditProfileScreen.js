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
  const [original, setOriginal] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
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
      setAvatarRemote(p.avatar_url || null);
      setLoading(false);
    })();
  }, []);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Libera o acesso às fotos pra poder mudar teu avatar.');
      return;
    }
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

        <Text style={styles.footer}>
          Quer mudar email, senha ou deletar a conta? Por enquanto use o site em bluetubeviral.com/blue.
        </Text>
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
  footer: {
    color: COLORS.textDim,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 8,
  },
});
