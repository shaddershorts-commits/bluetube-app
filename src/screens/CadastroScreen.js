import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, Animated, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, API_BASE } from '../constants';
import LogoBlueTube from '../components/LogoBlueTube';

/* Forca da senha: 0=fraca 1=media 2=forte */
function senhaForca(pwd) {
  if (pwd.length < 6) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return 0;
  if (score <= 2) return 1;
  return 2;
}

const FORCA_COR = ['#ef4444', '#f59e0b', '#22c55e'];
const FORCA_LABEL = ['Fraca', 'Media', 'Forte'];

export default function CadastroScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [termos, setTermos] = useState(false);
  const [idade16, setIdade16] = useState(false); // Fix 6 (Gap 5): age check 16+
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocus, setEmailFocus] = useState(false);
  const [pwdFocus, setPwdFocus] = useState(false);
  const [confirmFocus, setConfirmFocus] = useState(false);

  const forca = senhaForca(password);
  const forcaAnim = useRef(new Animated.Value(0)).current;

  const handleSubmit = async () => {
    setError('');
    if (!email || !password || !confirmPwd) {
      setError('Preencha todos os campos');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email invalido');
      return;
    }
    if (password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirmPwd) {
      setError('As senhas nao coincidem');
      return;
    }
    if (!idade16) {
      setError('Voce precisa ter 16 anos ou mais para criar conta');
      return;
    }
    if (!termos) {
      setError('Aceite os termos para continuar');
      return;
    }

    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signup', email, password }),
      });
      const d = await r.json().catch(() => ({}));

      if (r.ok && (d.session?.access_token || d.access_token)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        // Vai para OTP para confirmar email
        navigation.replace('OTP', { email, fromCadastro: true });
      } else if (d.error?.includes('already registered') || d.code === 'USER_ALREADY_EXISTS') {
        setError('Este email ja esta cadastrado. Faca login.');
      } else {
        // Pode ser que signup precisou verificar email via OTP
        // TODO: backend blue-onboarding nao tem action verify-otp confirmado
        // Se o signup retornar sem token, redireciona pra OTP com fallback
        navigation.replace('OTP', { email, fromCadastro: true });
      }
    } catch {
      setError('Erro de conexao. Tente novamente.');
    }
    setLoading(false);
  };

  return (
    <LinearGradient colors={[COLORS.background, COLORS.surface]} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <View style={styles.logoWrap}>
            <LogoBlueTube width={200} height={115} variant="stacked" tagline />
            <Text style={styles.sub}>Crie sua conta gratis</Text>
          </View>

          {/* Email */}
          <View style={[styles.inputWrap, emailFocus && styles.inputFocus]}>
            <Ionicons name="mail-outline" size={18} color={COLORS.textDim} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.textDim}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setEmailFocus(true)}
              onBlur={() => setEmailFocus(false)}
            />
          </View>

          {/* Senha */}
          <View style={[styles.inputWrap, pwdFocus && styles.inputFocus]}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.textDim} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Senha (min. 6 caracteres)"
              placeholderTextColor={COLORS.textDim}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPwd}
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setPwdFocus(true)}
              onBlur={() => setPwdFocus(false)}
            />
            <TouchableOpacity onPress={() => setShowPwd(s => !s)} hitSlop={12} style={styles.eye}>
              <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Indicador de forca */}
          {password.length > 0 && (
            <View style={styles.forcaWrap}>
              <View style={styles.forcaBars}>
                {[0, 1, 2].map(i => (
                  <View
                    key={i}
                    style={[
                      styles.forcaBar,
                      { backgroundColor: i <= forca ? FORCA_COR[forca] : 'rgba(255,255,255,0.1)' },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.forcaLabel, { color: FORCA_COR[forca] }]}>
                {FORCA_LABEL[forca]}
              </Text>
            </View>
          )}

          {/* Confirmar senha */}
          <View style={[styles.inputWrap, confirmFocus && styles.inputFocus]}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.textDim} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Confirmar senha"
              placeholderTextColor={COLORS.textDim}
              value={confirmPwd}
              onChangeText={setConfirmPwd}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setConfirmFocus(true)}
              onBlur={() => setConfirmFocus(false)}
            />
            <TouchableOpacity onPress={() => setShowConfirm(s => !s)} hitSlop={12} style={styles.eye}>
              <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Match indicator */}
          {confirmPwd.length > 0 && (
            <Text style={{ fontSize: 12, marginBottom: 8, marginLeft: 4, color: password === confirmPwd ? COLORS.success : COLORS.error }}>
              {password === confirmPwd ? '✓ Senhas coincidem' : '✗ Senhas diferentes'}
            </Text>
          )}

          {/* Idade 16+ (Fix 6 - Gap 5) */}
          <TouchableOpacity
            style={styles.termosRow}
            onPress={() => setIdade16(t => !t)}
            activeOpacity={0.7}>
            <View style={[styles.checkbox, idade16 && styles.checkboxOn]}>
              {idade16 && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.termosText}>
              Tenho 16 anos ou mais
            </Text>
          </TouchableOpacity>

          {/* Termos */}
          <TouchableOpacity
            style={styles.termosRow}
            onPress={() => setTermos(t => !t)}
            activeOpacity={0.7}>
            <View style={[styles.checkbox, termos && styles.checkboxOn]}>
              {termos && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.termosText}>
              Li e aceito os{' '}
              <Text
                style={{ color: COLORS.accent }}
                onPress={() => Linking.openURL('https://bluetubeviral.com/termos').catch(() => {})}>
                Termos de Uso
              </Text>
              {' '}e a{' '}
              <Text
                style={{ color: COLORS.accent }}
                onPress={() => Linking.openURL('https://bluetubeviral.com/privacidade').catch(() => {})}>
                Politica de Privacidade
              </Text>
            </Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Botao */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={loading}
            style={styles.btnWrap}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btn}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Criar conta</Text>}
            </LinearGradient>
          </TouchableOpacity>

          {/* Voltar pra login */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.replace('Login')}>
            <Text style={styles.loginText}>
              Ja tem conta? <Text style={{ color: COLORS.accent }}>Entrar</Text>
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center', paddingVertical: 48 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  sub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(0,170,255,0.2)',
    borderRadius: 14, paddingHorizontal: 14, marginBottom: 12,
  },
  inputFocus: { borderColor: 'rgba(0,170,255,0.6)' },
  icon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, color: '#fff', fontSize: 15 },
  eye: { padding: 6 },
  forcaWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginLeft: 4 },
  forcaBars: { flexDirection: 'row', gap: 4, marginRight: 8 },
  forcaBar: { width: 36, height: 4, borderRadius: 2 },
  forcaLabel: { fontSize: 12, fontWeight: '600' },
  termosRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 10 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 1.5, borderColor: 'rgba(0,170,255,0.4)',
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  termosText: { flex: 1, color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  error: { color: COLORS.error, textAlign: 'center', marginVertical: 6, fontSize: 13 },
  btnWrap: {
    borderRadius: 14, marginTop: 4,
    shadowColor: COLORS.accent, shadowOpacity: 0.4, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  btn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  loginLink: { alignItems: 'center', marginTop: 20, padding: 6 },
  loginText: { color: COLORS.textSecondary, fontSize: 13 },
});
