import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store';
import { COLORS } from '../constants';
import blueAPI from '../api';

export default function LoginScreen({ navigation }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setToken, setUser } = useAuthStore();

  const handleSubmit = async () => {
    if (!email || !password) { setError('Preencha email e senha'); return; }
    setLoading(true); setError('');
    try {
      const d = mode === 'signin' ? await blueAPI.signin(email, password) : await blueAPI.signup(email, password);
      const token = d.session?.access_token || d.access_token;
      const refresh = d.session?.refresh_token;
      if (!token) { setError(d.error || 'Erro ao autenticar'); setLoading(false); return; }
      await setToken(token);
      if (refresh) await SecureStore.setItemAsync('bt_refresh_token', refresh);
      setUser(d.session?.user || d.user);
    } catch (e) {
      setError('Erro de conexão');
    }
    setLoading(false);
  };

  return (
    <LinearGradient colors={[COLORS.background, COLORS.surface]} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <Text style={styles.logo}>Blue<Text style={{ color: COLORS.neon }}>Tube</Text></Text>
        <Text style={styles.sub}>A nova rede social de vídeos do Brasil</Text>

        <View style={styles.tabs}>
          <TouchableOpacity onPress={() => setMode('signin')} style={[styles.tab, mode === 'signin' && styles.tabActive]}>
            <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>Entrar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('signup')} style={[styles.tab, mode === 'signup' && styles.tabActive]}>
            <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Criar conta</Text>
          </TouchableOpacity>
        </View>

        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={COLORS.textDim}
          value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Senha" placeholderTextColor={COLORS.textDim}
          value={password} onChangeText={setPassword} secureTextEntry />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{mode === 'signin' ? 'Entrar →' : 'Criar conta →'}</Text>}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  logo: { color: '#fff', fontSize: 36, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  sub: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 40 },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4, marginBottom: 20 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: 'rgba(59,130,246,0.2)' },
  tabText: { color: COLORS.textSecondary, fontWeight: '600' },
  tabTextActive: { color: COLORS.neon },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, color: '#fff', marginBottom: 12, fontSize: 15 },
  btn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  error: { color: COLORS.error, textAlign: 'center', marginVertical: 6, fontSize: 13 },
});
