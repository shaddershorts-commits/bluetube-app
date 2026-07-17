import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Platform, Modal, Pressable,
  TextInput, Switch, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store';
import blueAPI from '../api';
import { registerPush, unregisterPush, isPushEnabled } from '../hooks/useNotifications';
import { COLORS } from '../constants';
import { LANGS, useLangStore, useT } from '../i18n';

function SettingItem({ icon, label, value, onPress, danger }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.row} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={danger ? COLORS.red : COLORS.text} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, danger && { color: COLORS.red }]}>{label}</Text>
        {value ? <Text style={styles.value}>{value}</Text> : null}
      </View>
      {!danger && <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />}
    </TouchableOpacity>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <GlassCard padded={false}>
        {children}
      </GlassCard>
    </View>
  );
}

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const nav = useNavigation();
  const [appVersion, setAppVersion] = useState('');
  const [langModal, setLangModal] = useState(false);
  // Push toggle
  const [pushOn, setPushOn] = useState(false);
  // Privacidade + tipo de conta (blue_profiles.is_private / account_type)
  const [isPrivate, setIsPrivate] = useState(false);
  const [accountType, setAccountType] = useState('profissional');

  useEffect(() => {
    blueAPI.meuPerfil().then((r) => {
      const p = r?.profile || r || {};
      setIsPrivate(!!p.is_private);
      if (p.account_type) setAccountType(p.account_type);
    }).catch(() => {});
  }, []);

  const togglePrivate = async (v) => {
    setIsPrivate(v);
    const r = await blueAPI.atualizarPerfil({ is_private: v }).catch(() => null);
    if (!r?.ok) { setIsPrivate(!v); Alert.alert('Não deu', 'Tenta de novo em alguns segundos.'); }
  };

  const escolherTipoConta = () => {
    Alert.alert(
      'Tipo de conta',
      'Pessoal: versão simples — perfil pra conversar no BlueChat e assistir vídeos, sem insights, sem contagem de curtidas e sem monetização.\n\nProfissional: todas as ferramentas — analytics, curtidas visíveis e monetização.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: '👤 Pessoal', onPress: () => salvarTipo('pessoal') },
        { text: '💼 Profissional', onPress: () => salvarTipo('profissional') },
      ]
    );
  };
  const salvarTipo = async (tipo) => {
    const antes = accountType;
    setAccountType(tipo);
    const r = await blueAPI.atualizarPerfil({ account_type: tipo }).catch(() => null);
    if (!r?.ok) { setAccountType(antes); Alert.alert('Não deu', 'Tenta de novo em alguns segundos.'); }
  };
  // Mudar senha (modal em 3 passos: enviar código → código 60s → nova senha)
  const [pwdModal, setPwdModal] = useState(false);
  const [pwdStep, setPwdStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [otpLeft, setOtpLeft] = useState(60);
  const [novaSenha, setNovaSenha] = useState('');
  const [repeteSenha, setRepeteSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);

  useEffect(() => { isPushEnabled().then(setPushOn); }, []);

  // countdown do código (1 minuto pra preencher)
  useEffect(() => {
    if (!pwdModal || pwdStep !== 2 || otpLeft <= 0) return;
    const t = setTimeout(() => setOtpLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [pwdModal, pwdStep, otpLeft]);

  const togglePush = async (v) => {
    setPushOn(v);
    if (v) {
      const ok = await registerPush();
      if (!ok) {
        setPushOn(false);
        Alert.alert('Permissão negada', 'Ative as notificações do Blue nas configurações do Android.');
      }
    } else {
      await unregisterPush();
    }
  };

  const enviarCodigo = async () => {
    setPwdBusy(true);
    const r = await blueAPI.sendOtp(user?.email).catch((e) => ({ error: e.message }));
    setPwdBusy(false);
    if (r?.error) { Alert.alert('Não deu pra enviar', r.error); return; }
    setOtp(''); setOtpLeft(60); setPwdStep(2);
  };

  const confirmarCodigo = () => {
    if (otp.trim().length < 6) { Alert.alert('Código', 'Digite o código de 6 dígitos do email.'); return; }
    setNovaSenha(''); setRepeteSenha(''); setVerSenha(false); setPwdStep(3);
  };

  const salvarSenha = async () => {
    if (novaSenha.length < 6) { Alert.alert('Senha curta', 'Mínimo de 6 caracteres.'); return; }
    if (novaSenha !== repeteSenha) { Alert.alert('Não bateu', 'As duas senhas precisam ser iguais.'); return; }
    setPwdBusy(true);
    const r = await blueAPI.changePassword(otp.trim(), novaSenha).catch((e) => ({ error: e.message }));
    setPwdBusy(false);
    if (r?.error) { Alert.alert('Não deu pra trocar', r.error); return; }
    setPwdModal(false);
    Alert.alert('Senha alterada! 🔒', 'Entre de novo com a senha nova.', [
      { text: 'OK', onPress: async () => {
        await logout();
        nav.reset({ index: 1, routes: [{ name: 'Main' }, { name: 'Login' }] });
      } },
    ]);
  };

  const abrirPwdModal = () => { setPwdStep(1); setOtp(''); setNovaSenha(''); setRepeteSenha(''); setPwdModal(true); };
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const t = useT();
  const currentLang = LANGS.find((l) => l.code === lang) || LANGS[0];

  useEffect(() => {
    try {
      const v = Constants.expoConfig?.version || Constants.manifest?.version || '';
      const build = Constants.expoConfig?.runtimeVersion || '';
      setAppVersion(v + (build ? ` (${build})` : ''));
    } catch (_) {}
  }, []);

  const handleLogout = () => {
    Alert.alert(t('st_logout_t'), t('st_sure'), [
      { text: t('st_cancel'), style: 'cancel' },
      { text: t('st_logout_t'), style: 'destructive', onPress: logout },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Excluir sua conta?',
      'Sua conta é ÚNICA para o app e o site bluetubeviral.com. Excluir apaga permanentemente: perfil, vídeos, comentários, mensagens e curtidas. Isso NÃO pode ser desfeito.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar', style: 'destructive', onPress: () => Alert.alert('Última confirmação', 'Excluir tudo agora, de forma definitiva?', [
          { text: 'Voltar', style: 'cancel' },
          { text: 'EXCLUIR MINHA CONTA', style: 'destructive', onPress: async () => {
            const r = await blueAPI.deleteAccount().catch((e) => ({ error: e.message }));
            if (r?.active_subscription) { Alert.alert('Assinatura ativa', 'Cancele sua assinatura primeiro (no site: Perfil → Gerenciar assinatura) e depois volte aqui.'); return; }
            if (r?.error) { Alert.alert('Não foi possível excluir', r.error); return; }
            await logout();
            Alert.alert('Conta excluída', 'Sua conta e seus dados foram removidos. Até logo! 👋');
            nav.reset({ index: 0, routes: [{ name: 'Main' }] });
          } },
        ]) },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header title={t('st_title')} showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>

        <Section title={t('st_account')}>
          <SettingItem
            icon="mail-outline"
            label={t('st_email')}
            value={user?.email || '—'}
            onPress={() => Alert.alert(t('st_email'), user?.email || t('st_email_none'))}
          />
          <SettingItem
            icon="key-outline"
            label={t('st_password')}
            value="Trocar com código por email"
            onPress={abrirPwdModal}
          />
          <View style={styles.row}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.text} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Perfil privado</Text>
              <Text style={styles.value}>{isPrivate ? 'Só seguidores veem seus vídeos' : 'Qualquer pessoa vê seu perfil'}</Text>
            </View>
            <Switch value={isPrivate} onValueChange={togglePrivate} trackColor={{ true: COLORS.primary }} />
          </View>
          <SettingItem
            icon={accountType === 'pessoal' ? 'person-outline' : 'briefcase-outline'}
            label="Tipo de conta"
            value={accountType === 'pessoal' ? 'Pessoal — simples, só chat e vídeos' : 'Profissional — insights e monetização'}
            onPress={escolherTipoConta}
          />
          <SettingItem
            icon="color-palette-outline"
            label="Temas"
            value="Estilos do BlueChat + modo claro/escuro do app"
            onPress={() => nav.navigate('Temas')}
          />
          <SettingItem
            icon="heart-outline"
            label="Sua atividade"
            value="Todos os posts que você curtiu"
            onPress={() => nav.navigate('Atividade')}
          />
        </Section>

        <Section title={t('st_content')}>
          <SettingItem
            icon="language-outline"
            label={t('st_lang')}
            value={`${currentLang.flag} ${currentLang.name}`}
            onPress={() => setLangModal(true)}
          />
          <View style={styles.row}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.text} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t('st_push')}</Text>
              <Text style={styles.value}>{pushOn ? 'Ativadas' : 'Desativadas'}</Text>
            </View>
            <Switch value={pushOn} onValueChange={togglePush} trackColor={{ true: COLORS.primary }} />
          </View>
        </Section>

        <Section title={t('st_about')}>
          <SettingItem
            icon="document-text-outline"
            label={t('st_terms')}
            onPress={() => Linking.openURL('https://bluetubeviral.com/termos').catch(() => {})}
          />
          <SettingItem
            icon="shield-outline"
            label={t('st_privacy')}
            onPress={() => Linking.openURL('https://bluetubeviral.com/privacidade').catch(() => {})}
          />
          <SettingItem
            icon="help-circle-outline"
            label={t('st_support')}
            value="bluetubeoficial@gmail.com"
            onPress={() => Linking.openURL('mailto:bluetubeoficial@gmail.com?subject=Suporte%20Blue%20App').catch(() => Alert.alert('Suporte', 'Escreva pra bluetubeoficial@gmail.com'))}
          />
          <SettingItem
            icon="information-circle-outline"
            label={t('st_version')}
            value={appVersion || '—'}
            onPress={() => {}}
          />
        </Section>

        <Section title={t('st_danger')}>
          <SettingItem
            icon="log-out-outline"
            label={t('st_logout')}
            onPress={handleLogout}
            danger
          />
          <SettingItem
            icon="trash-outline"
            label={t('st_delete')}
            onPress={handleDeleteAccount}
            danger
          />
        </Section>

        <Text style={styles.platform}>{Platform.OS === 'android' ? 'Android' : Platform.OS} · BlueTube</Text>
      </ScrollView>

      {/* Mudar senha — 3 passos: enviar código → código (60s) → nova senha */}
      <Modal visible={pwdModal} transparent animationType="fade" onRequestClose={() => setPwdModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => !pwdBusy && setPwdModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>🔑 Mudar senha</Text>

            {pwdStep === 1 && (
              <>
                <Text style={styles.pwdHint}>Vamos enviar um código de 6 dígitos pro email da sua conta:</Text>
                <View style={styles.pwdEmailBox}><Text style={styles.pwdEmail}>{user?.email || '—'}</Text></View>
                <TouchableOpacity style={styles.pwdBtn} onPress={enviarCodigo} disabled={pwdBusy}>
                  {pwdBusy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.pwdBtnText}>Enviar código →</Text>}
                </TouchableOpacity>
              </>
            )}

            {pwdStep === 2 && (
              <>
                <Text style={styles.pwdHint}>Digite o código que chegou no seu email:</Text>
                <TextInput
                  style={[styles.pwdInput, styles.pwdOtp]}
                  value={otp} onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad" maxLength={6} placeholder="••••••"
                  placeholderTextColor={COLORS.textDim} editable={otpLeft > 0} autoFocus
                />
                {otpLeft > 0 ? (
                  <Text style={styles.pwdTimer}>⏱ {otpLeft}s pra preencher</Text>
                ) : (
                  <TouchableOpacity onPress={enviarCodigo} disabled={pwdBusy}>
                    <Text style={styles.pwdResend}>Código expirou — reenviar novo código ↻</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.pwdBtn, (otp.length < 6 || otpLeft <= 0) && { opacity: 0.5 }]} onPress={confirmarCodigo} disabled={otp.length < 6 || otpLeft <= 0}>
                  <Text style={styles.pwdBtnText}>Confirmar código →</Text>
                </TouchableOpacity>
              </>
            )}

            {pwdStep === 3 && (
              <>
                <Text style={styles.pwdHint}>Agora crie a nova senha (mín. 6 caracteres):</Text>
                <View style={styles.pwdRow}>
                  <TextInput
                    style={[styles.pwdInput, { flex: 1, marginBottom: 0 }]}
                    value={novaSenha} onChangeText={setNovaSenha}
                    secureTextEntry={!verSenha} placeholder="Nova senha"
                    placeholderTextColor={COLORS.textDim} autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setVerSenha((v) => !v)} hitSlop={10} style={styles.pwdEye}>
                    <Ionicons name={verSenha ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.pwdInput}
                  value={repeteSenha} onChangeText={setRepeteSenha}
                  secureTextEntry={!verSenha} placeholder="Repetir a nova senha"
                  placeholderTextColor={COLORS.textDim} autoCapitalize="none"
                />
                <TouchableOpacity style={styles.pwdBtn} onPress={salvarSenha} disabled={pwdBusy}>
                  {pwdBusy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.pwdBtnText}>Salvar nova senha 🔒</Text>}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={() => setPwdModal(false)} disabled={pwdBusy} style={{ marginTop: 10 }}>
              <Text style={styles.pwdCancel}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Seletor de idioma — antes era um Alert "Em breve" (stub morto) */}
      <Modal visible={langModal} transparent animationType="fade" onRequestClose={() => setLangModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setLangModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t('st_pick_lang')}</Text>
            {LANGS.map((l) => (
              <TouchableOpacity
                key={l.code}
                style={[styles.langRow, l.code === lang && styles.langRowActive]}
                activeOpacity={0.7}
                onPress={() => { setLang(l.code); setLangModal(false); }}>
                <Text style={styles.langFlag}>{l.flag}</Text>
                <Text style={[styles.langName, l.code === lang && { color: COLORS.neon }]}>{l.name}</Text>
                {l.code === lang && <Ionicons name="checkmark" size={18} color={COLORS.neon} />}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: {
    color: COLORS.textSecondary, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, marginBottom: 8, paddingHorizontal: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  label: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  value: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  platform: { color: COLORS.textDim, fontSize: 11, textAlign: 'center', marginTop: 24 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  modalCard: {
    width: '100%', backgroundColor: '#0a1020', borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: 'rgba(0,170,255,0.2)',
  },
  modalTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  pwdHint: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 12, textAlign: 'center' },
  pwdEmailBox: { backgroundColor: 'rgba(0,170,255,0.07)', borderWidth: 1, borderColor: 'rgba(0,170,255,0.2)', borderRadius: 10, padding: 12, marginBottom: 14 },
  pwdEmail: { color: COLORS.neon, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  pwdInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(0,170,255,0.2)', borderRadius: 10, color: COLORS.text, fontSize: 15, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 12 },
  pwdOtp: { textAlign: 'center', fontSize: 24, letterSpacing: 10, fontWeight: '800' },
  pwdRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  pwdEye: { padding: 8 },
  pwdTimer: { color: '#fbbf24', fontSize: 12.5, textAlign: 'center', marginBottom: 12 },
  pwdResend: { color: COLORS.neon, fontSize: 12.5, textAlign: 'center', marginBottom: 12, fontWeight: '700' },
  pwdBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  pwdBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  pwdCancel: { color: COLORS.textDim, fontSize: 13, textAlign: 'center', paddingVertical: 6 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10 },
  langRowActive: { backgroundColor: 'rgba(0,170,255,0.08)' },
  langFlag: { fontSize: 20 },
  langName: { color: COLORS.text, fontSize: 14, fontWeight: '600', flex: 1 },
});
