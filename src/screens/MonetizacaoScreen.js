import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, TouchableOpacity, Linking, Alert,
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

  const [prog, setProg] = useState(null);
  const [aplicando, setAplicando] = useState(null);

  const load = useCallback(async () => {
    // as duas chamadas são independentes: se uma falhar, a outra ainda
    // renderiza. Antes um erro no saldo deixaria a tela inteira vazia.
    const [d, p] = await Promise.all([
      blueAPI.monetizacaoStatus().catch((e) => { console.error('[Monetizacao] saldo:', e?.message); return null; }),
      blueAPI.programaStatus().catch((e) => { console.error('[Monetizacao] programa:', e?.message); return null; }),
    ]);
    setStats(d || null);
    setProg(p && p.marcos ? p : null);
    setLoading(false);
    setRefreshing(false);
  }, []);

  const aplicar = useCallback(async (marco) => {
    setAplicando(marco.id);
    const r = await blueAPI.programaAplicar(marco.id).catch((e) => ({ error: e.message }));
    setAplicando(null);
    if (r?.error) { Alert.alert('Não deu pra enviar', r.error); return; }
    Alert.alert(
      'Candidatura enviada ✅',
      `Recebemos sua inscrição em "${marco.titulo}". Vamos analisar seu perfil e damos um retorno muito em breve.`
    );
    load();
  }, [load]);

  const pedirAviso = useCallback(async (marco) => {
    setAplicando(marco.id);
    const r = await blueAPI.programaAvisar(marco.id).catch((e) => ({ error: e.message }));
    setAplicando(null);
    if (r?.error) { Alert.alert('Ops', r.error); return; }
    Alert.alert('Combinado! 🔔', `A gente te avisa assim que você chegar em ${marco.min.toLocaleString('pt-BR')} seguidores.`);
    load();
  }, [load]);

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

        {/* ── PROGRAMA DE MONETIZAÇÃO (marcos por seguidores) ────────────
            Só renderiza se o backend respondeu. Falha na chamada = seção
            some, o resto da tela continua funcionando. */}
        {prog && (
          <View style={styles.progWrap}>
            <Text style={styles.progTitulo}>Programa de Monetização</Text>
            <Text style={styles.progSub}>
              {Number(prog.seguidores || 0).toLocaleString('pt-BR')} {Number(prog.seguidores || 0) === 1 ? 'seguidor' : 'seguidores'} · cada etapa libera uma forma nova de ganhar
            </Text>

            {prog.marcos.map((m) => {
              const enviado = m.status === 'em_analise';
              const aprovado = m.status === 'aprovado';
              const carregando = aplicando === m.id;
              return (
                <View key={m.id} style={[styles.marcoCard, m.atingiu && styles.marcoCardOn]}>
                  <View style={styles.marcoTopo}>
                    <View style={[styles.marcoBadge, m.atingiu && styles.marcoBadgeOn]}>
                      <Ionicons
                        name={aprovado ? 'checkmark-circle' : m.atingiu ? 'lock-open' : 'lock-closed'}
                        size={15}
                        color={m.atingiu ? '#10b981' : COLORS.textDim}
                      />
                      <Text style={[styles.marcoBadgeTxt, m.atingiu && { color: '#10b981' }]}>
                        {Number(m.min || 0).toLocaleString('pt-BR')}
                      </Text>
                    </View>
                    <Text style={styles.marcoTitulo}>{m.titulo}</Text>
                  </View>
                  <Text style={styles.marcoDesc}>{m.desc}</Text>

                  {/* barra de progresso — mostra o quanto falta, não só o bloqueio */}
                  {!m.atingiu && (
                    <>
                      <View style={styles.barra}>
                        <View style={[styles.barraFill, { width: `${m.progresso}%` }]} />
                      </View>
                      <Text style={styles.marcoFaltam}>
                        Faltam {Number(m.faltam || 0).toLocaleString('pt-BR')} {Number(m.faltam || 0) === 1 ? 'seguidor' : 'seguidores'}
                      </Text>
                    </>
                  )}

                  {aprovado ? (
                    <View style={[styles.marcoBtn, styles.marcoBtnOk]}>
                      <Ionicons name="checkmark-circle" size={15} color="#10b981" />
                      <Text style={[styles.marcoBtnTxt, { color: '#10b981' }]}>Liberado pra você</Text>
                    </View>
                  ) : enviado ? (
                    <View style={[styles.marcoBtn, styles.marcoBtnAguard]}>
                      <Ionicons name="hourglass-outline" size={15} color="#f59e0b" />
                      <Text style={[styles.marcoBtnTxt, { color: '#f59e0b' }]}>Em análise — retorno em breve</Text>
                    </View>
                  ) : m.atingiu ? (
                    <TouchableOpacity
                      style={[styles.marcoBtn, styles.marcoBtnCta]}
                      disabled={carregando || !prog.programa_pronto}
                      onPress={() => aplicar(m)}>
                      {carregando ? <ActivityIndicator size="small" color="#fff" /> : (
                        <>
                          <Ionicons name="paper-plane" size={15} color="#fff" />
                          <Text style={[styles.marcoBtnTxt, { color: '#fff' }]}>Quero aplicar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : m.aviso_ativo ? (
                    <View style={[styles.marcoBtn, styles.marcoBtnAguard]}>
                      <Ionicons name="notifications" size={15} color={COLORS.neon} />
                      <Text style={[styles.marcoBtnTxt, { color: COLORS.neon }]}>Te avisamos ao chegar lá</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.marcoBtn, styles.marcoBtnGhost]}
                      disabled={carregando || !prog.programa_pronto}
                      onPress={() => pedirAviso(m)}>
                      {carregando ? <ActivityIndicator size="small" color={COLORS.neon} /> : (
                        <>
                          <Ionicons name="notifications-outline" size={15} color={COLORS.neon} />
                          <Text style={[styles.marcoBtnTxt, { color: COLORS.neon }]}>Me avisa quando eu atingir</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {!prog.programa_pronto && (
              <Text style={styles.progAviso}>
                As inscrições abrem em instantes — os marcos acima já valem pra você acompanhar seu progresso.
              </Text>
            )}
          </View>
        )}
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
  // programa de marcos
  progWrap: { marginTop: 26, paddingHorizontal: 16 },
  progTitulo: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  progSub: { color: COLORS.textSecondary, fontSize: 12.5, marginTop: 3, marginBottom: 14 },
  marcoCard: {
    borderRadius: 16, padding: 15, marginBottom: 12,
    backgroundColor: COLORS.chipBg, borderWidth: 1, borderColor: COLORS.border,
  },
  marcoCardOn: { borderColor: 'rgba(16,185,129,0.4)', backgroundColor: 'rgba(16,185,129,0.06)' },
  marcoTopo: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 5 },
  marcoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 100,
    backgroundColor: COLORS.inputBg,
  },
  marcoBadgeOn: { backgroundColor: 'rgba(16,185,129,0.14)' },
  marcoBadgeTxt: { color: COLORS.textDim, fontSize: 11.5, fontWeight: '800' },
  marcoTitulo: { color: COLORS.text, fontSize: 14.5, fontWeight: '700', flex: 1 },
  marcoDesc: { color: COLORS.textSecondary, fontSize: 12.5, lineHeight: 18 },
  barra: { height: 5, borderRadius: 3, backgroundColor: COLORS.inputBg, marginTop: 11, overflow: 'hidden' },
  barraFill: { height: '100%', backgroundColor: COLORS.neon, borderRadius: 3 },
  marcoFaltam: { color: COLORS.textDim, fontSize: 11.5, marginTop: 6 },
  marcoBtn: {
    marginTop: 12, paddingVertical: 11, borderRadius: 11,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  marcoBtnCta: { backgroundColor: COLORS.primary },
  marcoBtnGhost: { borderWidth: 1, borderColor: COLORS.border },
  marcoBtnOk: { backgroundColor: 'rgba(16,185,129,0.12)' },
  marcoBtnAguard: { backgroundColor: COLORS.inputBg },
  marcoBtnTxt: { fontSize: 13, fontWeight: '700' },
  progAviso: { color: COLORS.textDim, fontSize: 11.5, textAlign: 'center', marginTop: 4, marginBottom: 8, lineHeight: 17 },
});
