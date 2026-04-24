import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, TouchableOpacity, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import blueAPI from '../api';
import { COLORS } from '../constants';

export default function MonetizacaoScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await blueAPI.monetizacaoStatus();
      setStats(d || null);
    } catch (e) {
      console.error('[MonetizacaoScreen] erro:', e?.message || e);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <Header title="Monetização" showBack />
        <View style={styles.center}><ActivityIndicator color={COLORS.neon} /></View>
      </View>
    );
  }

  const saldo = Number(stats?.saldo_disponivel || 0);
  const totalSacado = Number(stats?.total_sacado || 0);
  const temConta = !!stats?.tem_conta;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header title="Monetização" showBack />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neon} />}
        contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Card de saldo */}
        <View style={styles.saldoCard}>
          <Text style={styles.saldoLabel}>SALDO DISPONÍVEL</Text>
          <Text style={styles.saldoValor}>R$ {saldo.toFixed(2).replace('.', ',')}</Text>
          {totalSacado > 0 && (
            <Text style={styles.saldoSubtext}>Total já sacado: R$ {totalSacado.toFixed(2).replace('.', ',')}</Text>
          )}
        </View>

        {/* Status conta */}
        <GlassCard style={styles.statusBoxWrap} padded={false}>
          <View style={styles.statusBox}>
            <Ionicons
              name={temConta ? 'checkmark-circle' : 'alert-circle'}
              size={20}
              color={temConta ? '#10b981' : '#f59e0b'}
            />
            <Text style={styles.statusText}>
              {temConta
                ? 'Conta de saque configurada'
                : 'Configure sua conta pra receber pagamentos'}
            </Text>
          </View>
        </GlassCard>

        {/* CTA — abre versao web pra saque (mais robusto que portar todo fluxo Stripe Connect/Asaas pro nativo) */}
        <TouchableOpacity
          style={styles.ctaBtn}
          activeOpacity={0.85}
          onPress={() => Linking.openURL('https://bluetubeviral.com/blue-monetizacao').catch(() => {})}>
          <Ionicons name="cash-outline" size={18} color="#fff" />
          <Text style={styles.ctaText}>{temConta ? 'Sacar via web' : 'Configurar conta de saque'}</Text>
          <Ionicons name="open-outline" size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <Text style={styles.hint}>
          Saque, configuração de conta bancária e relatório completo continuam no site.
          Em breve, totalmente nativo.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  saldoCard: {
    margin: 16, padding: 24, borderRadius: 16,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)',
    alignItems: 'center',
  },
  saldoLabel: { color: '#10b981', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  saldoValor: { color: '#10b981', fontSize: 36, fontWeight: '800' },
  saldoSubtext: { color: COLORS.textSecondary, fontSize: 12, marginTop: 10 },
  statusBoxWrap: { marginHorizontal: 16 },
  statusBox: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusText: { color: COLORS.text, fontSize: 13, flex: 1 },
  ctaBtn: {
    marginHorizontal: 16, marginTop: 18,
    paddingVertical: 14, borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  ctaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  hint: { color: COLORS.textDim, fontSize: 12, textAlign: 'center', marginTop: 16, paddingHorizontal: 32, lineHeight: 18 },
});
