import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../store';
import { COLORS, API_BASE } from '../constants';
import blueAPI from '../api';
import LogoBlueTube from '../components/LogoBlueTube';

const EMAIL_KEY = 'bt_last_email';

export default function LoginScreen({ navigation }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [pwdFocus, setPwdFocus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setToken, setUser } = useAuthStore();

  useEffect(() => {
    SecureStore.getItemAsync(EMAIL_KEY).then((e) => { if (e) setEmail(e); }).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!email || !password) { setError('Preencha email e senha'); return; }
    setLoading(true); setError('');
    try {
      const d = mode === 'signin' ? await blueAPI.signin(email, password) : await blueAPI.signup(email, password);
      const token = d.session?.access_token || d.access_token;
      const refresh = d.session?.refresh_token;
      if (!token) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setError(d.error || 'Erro ao autenticar');
        setLoading(false);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await SecureStore.setItemAsync(EMAIL_KEY, email).catch(() => {});
      await setToken(token);
      if (refresh) await SecureStore.setItemAsync('bt_refresh_token', refresh);
      setUser(d.session?.user || d.user);
    } catch (e) {
      setError('Erro de conexão');
    }
    setLoading(false);
  };

  const handleForgot = async () => {
    if (!email) { setError('Digite seu email acima primeiro'); return; }
    try {
      const r = await fetch(`${API_BASE}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forgot-password', email }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        Alert.alert('Código enviado', d.message || 'Verifique seu email para as instruções.');
      } else {
        Alert.alert('Aguarde', d.error || 'Recuperação por email ainda não disponível. Fale com o suporte.');
      }
    } catch {
      Alert.alert('Erro', 'Sem conexão. Tente novamente.');
    }
  };

  return (
    <LinearGradient colors={[COLORS.background, COLORS.surface]} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.logoWrap}>
          <LogoBlueTube width={220} height={64} />
          <Text style={styles.sub}>A nova rede social de vídeos do Brasil</Text>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity onPress={() => setMode('signin')} style={[styles.tab, mode === 'signin' && styles.tabActive]}>
            <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>Entrar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('signup')} style={[styles.tab, mode === 'signup' && styles.tabActive]}>
            <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Criar conta</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.inputWrap, emailFocus && styles.inputWrapFocus]}>
          <Ionicons name="mail-outline" size={18} color={COLORS.textDim} style={styles.inputIcon} />
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

        <View style={[styles.inputWrap, pwdFocus && styles.inputWrapFocus]}>
          <Ionicons name="lock-closed-outline" size={18} color={COLORS.textDim} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor={COLORS.textDim}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPwd}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setPwdFocus(true)}
            onBlur={() => setPwdFocus(false)}
          />
          <TouchableOpacity onPress={() => setShowPwd((s) => !s)} hitSlop={12} style={styles.eye}>
            <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity activeOpacity={0.85} onPress={handleSubmit} disabled={loading} style={styles.btnWrap}>
          <LinearGradient colors={[COLORS.primary, COLORS.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>{mode === 'signin' ? 'Entrar →' : 'Criar conta →'}</Text>
            }
          </LinearGradient>
        </TouchableOpacity>

        {mode === 'signin' && (
          <TouchableOpacity onPress={handleForgot} style={styles.forgotLink}>
            <Text style={styles.forgotText}>Esqueci minha senha →</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 36 },
  sub: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 10 },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4, marginBottom: 22 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: 'rgba(0,170,255,0.15)' },
  tabText: { color: COLORS.textSecondary, fontWeight: '600' },
  tabTextActive: { color: COLORS.accent },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,170,255,0.2)',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  inputWrapFocus: { borderColor: 'rgba(0,170,255,0.6)' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, color: '#fff', fontSize: 15 },
  eye: { padding: 6 },
  btnWrap: { borderRadius: 14, marginTop: 8, shadowColor: COLORS.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  btn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  forgotLink: { alignItems: 'center', marginTop: 18, padding: 6 },
  forgotText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  error: { color: COLORS.error, textAlign: 'center', marginVertical: 6, fontSize: 13 },
});
