import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Alert, Clipboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store';
import { COLORS, API_BASE } from '../constants';
import blueAPI from '../api';

const OTP_LEN = 6;
const RESEND_SECS = 59;

// Fix 6 (Gap 5): confirm-age com retry exponencial (1s, 3s, 8s).
// Caminho D fail-soft: NAO bloqueia signup se persistencia falhar.
// 4xx legitimo nao retry. Apenas 5xx/network retry.
async function confirmAgeWithRetry(token) {
  const delays = [1000, 3000, 8000];
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`${API_BASE}/v1/confirm-age`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      });
      if (r.ok) return { ok: true };
      if (r.status >= 400 && r.status < 500) {
        // 4xx (token invalido/etc): nao retry, fail definitivo
        return { ok: false, error: `4xx_${r.status}` };
      }
      // 5xx: retry
    } catch (e) {
      // network error: retry
    }
    if (i < 2) await new Promise(r => setTimeout(r, delays[i]));
  }
  return { ok: false, error: 'all_retries_failed' };
}

export default function OTPScreen({ navigation, route }) {
  const { email, fromCadastro } = route?.params || {};
  const [digits, setDigits] = useState(Array(OTP_LEN).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(RESEND_SECS);
  const [canResend, setCanResend] = useState(false);
  const inputs = useRef([]);
  const { setToken, setUser } = useAuthStore();

  // Countdown
  useEffect(() => {
    if (timer <= 0) { setCanResend(true); return; }
    const id = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(id); setCanResend(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const focusNext = (index) => {
    if (index < OTP_LEN - 1) inputs.current[index + 1]?.focus();
  };

  const focusPrev = (index) => {
    if (index > 0) inputs.current[index - 1]?.focus();
  };

  const handleChange = (text, index) => {
    // Suporte a paste: se colar 6 digitos de uma vez
    if (text.length > 1) {
      const clean = text.replace(/\D/g, '').slice(0, OTP_LEN);
      if (clean.length === OTP_LEN) {
        const arr = clean.split('');
        setDigits(arr);
        inputs.current[OTP_LEN - 1]?.focus();
        return;
      }
    }
    const d = text.replace(/\D/g, '').slice(0, 1);
    const next = [...digits];
    next[index] = d;
    setDigits(next);
    if (d) focusNext(index);
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index]) {
      focusPrev(index);
    }
  };

  const handlePaste = async (index) => {
    try {
      const text = await Clipboard.getString();
      handleChange(text, index);
    } catch {}
  };

  const handleVerify = useCallback(async () => {
    const code = digits.join('');
    if (code.length < OTP_LEN) {
      setError('Digite os 6 digitos do codigo');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // auth.js aceita action 'verify_otp' (underscore) — nao 'verify-otp' (hifen).
      // Bug original deixava signup app travado em produacao desde o inicio.
      const r = await fetch(`${API_BASE}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_otp', email, otp: code }),
      });
      const d = await r.json().catch(() => ({}));

      if (r.ok && (d.session?.access_token || d.access_token)) {
        const token = d.session?.access_token || d.access_token;
        const refresh = d.session?.refresh_token;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

        // Fix 6 (Gap 5) - Caminho D fail-soft: confirm-age com 3 retries (1s, 3s, 8s).
        // Se TODOS falharem, NAO bloqueia login. Login efetivo prossegue normal.
        // confirm-age e idempotente — proximo login regulariza automaticamente.
        confirmAgeWithRetry(token).catch((e) => {
          console.warn('[otp] confirm-age falhou apos retries — sera retry no proximo login:', e?.message);
        });

        await setToken(token);
        if (refresh) await SecureStore.setItemAsync('bt_refresh_token', refresh);
        setUser(d.session?.user || d.user);
        // Navigation vai para SetupPerfil ou Main dependendo do onboarding
      } else {
        // Fallback: backend pode nao ter verify-otp
        // Se foi chamado apos cadastro, login direto com as credenciais do cadastro
        Alert.alert(
          'Codigo enviado',
          d.error
            ? `Erro: ${d.error}. Verifique seu email e tente novamente.`
            : 'Verifique seu email para confirmar sua conta. Apos confirmar, faca login normalmente.',
          [{ text: 'Ir para Login', onPress: () => navigation.replace('Login') }]
        );
      }
    } catch {
      setError('Erro de conexao. Tente novamente.');
    }
    setLoading(false);
  }, [digits, email]);

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setTimer(RESEND_SECS);

    try {
      // auth.js linha 1692 aceita 'send_otp' (re-envia OTP gerando novo codigo).
      // Bug original 'resend-otp' caia em fallback silencioso; "Reenviar" nao funcionava.
      const r = await fetch(`${API_BASE}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_otp', email }),
      });
      const d = await r.json().catch(() => ({}));
      Alert.alert(
        'Codigo reenviado',
        d.message || 'Um novo codigo foi enviado para ' + email
      );
    } catch {
      Alert.alert('Erro', 'Nao foi possivel reenviar o codigo agora.');
    }

    // Reiniciar timer
    setTimer(RESEND_SECS);
    const id = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(id); setCanResend(true); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const allFilled = digits.every(d => d !== '');

  return (
    <LinearGradient colors={[COLORS.background, COLORS.surface]} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>

        {/* Header */}
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('Login')}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.content}>
          <Ionicons name="mail-open-outline" size={56} color={COLORS.accent} style={{ marginBottom: 16 }} />
          <Text style={styles.title}>Verifique seu email</Text>
          <Text style={styles.sub}>
            Enviamos um codigo de 6 digitos para{'\n'}
            <Text style={{ color: COLORS.accent, fontWeight: '700' }}>{email || 'seu email'}</Text>
          </Text>

          {/* 6 inputs OTP */}
          <View style={styles.otpRow}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={ref => (inputs.current[i] = ref)}
                style={[
                  styles.otpInput,
                  d ? styles.otpInputFilled : null,
                  error && !d ? styles.otpInputError : null,
                ]}
                value={d}
                onChangeText={text => handleChange(text, i)}
                onKeyPress={e => handleKeyPress(e, i)}
                onLongPress={() => handlePaste(i)}
                keyboardType="number-pad"
                maxLength={6}
                selectTextOnFocus
                caretHidden={false}
                autoFocus={i === 0}
              />
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Verificar */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleVerify}
            disabled={loading || !allFilled}
            style={[styles.btnWrap, (!allFilled || loading) && { opacity: 0.5 }]}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btn}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Verificar codigo</Text>}
            </LinearGradient>
          </TouchableOpacity>

          {/* Reenviar */}
          <View style={styles.resendRow}>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendActive}>Reenviar codigo</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendTimer}>
                Reenviar em <Text style={{ color: COLORS.accent }}>{timer}s</Text>
              </Text>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  back: { position: 'absolute', top: 52, left: 20, zIndex: 10, padding: 8 },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28, paddingTop: 80,
  },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  sub: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  otpInput: {
    width: 52, height: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5, borderColor: 'rgba(0,170,255,0.25)',
    borderRadius: 12, textAlign: 'center',
    color: '#fff', fontSize: 22, fontWeight: '700',
  },
  otpInputFilled: { borderColor: COLORS.accent, backgroundColor: 'rgba(0,170,255,0.1)' },
  otpInputError: { borderColor: COLORS.error },
  error: { color: COLORS.error, textAlign: 'center', marginBottom: 12, fontSize: 13 },
  btnWrap: {
    width: '100%', borderRadius: 14,
    shadowColor: COLORS.accent, shadowOpacity: 0.4,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  btn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  resendRow: { marginTop: 20, alignItems: 'center' },
  resendActive: { color: COLORS.accent, fontWeight: '700', fontSize: 14 },
  resendTimer: { color: COLORS.textSecondary, fontSize: 14 },
});
