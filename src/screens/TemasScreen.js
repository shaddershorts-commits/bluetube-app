// Temas do BlueChat: escolha de estilo (cor + ícones + fonte) com preview de
// bolhas, e modo Claro/Escuro das superfícies de conversa/configurações.
// O feed de vídeo permanece escuro (padrão de players verticais).
import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, DevSettings } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import Header from '../components/Header';
import { CHAT_THEMES, MODES, useThemeStore, useChatTheme, themedIcon } from '../store/theme';
import { applyMode } from '../constants';

export default function TemasScreen() {
  const T = useChatTheme();
  const { chatTheme, mode, setChatTheme, setMode } = useThemeStore();
  const styles = useMemo(() => mkStyles(T), [T]);
  const [reloading, setReloading] = useState(false);

  // Modo claro/escuro é GLOBAL: os estilos do app inteiro são criados na
  // abertura, então trocar exige salvar a preferência e reiniciar o JS (~1s).
  const trocarModo = async (m) => {
    if (m === mode || reloading) return;
    setMode(m);          // persiste em SecureStore (bt_app_mode)
    applyMode(m);        // paleta global pro que renderizar até o reload
    setReloading(true);
    setTimeout(async () => {
      try { await Updates.reloadAsync(); }
      catch (e) {
        try { DevSettings.reload(); }
        catch (e2) { setReloading(false); Alert.alert('Quase lá', 'Fecha e abre o app pra aplicar o tema.'); }
      }
    }, 350);
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.background }}>
      <Header title="Temas do BlueChat" showBack />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

        {/* Claro / Escuro */}
        <Text style={styles.section}>Aparência</Text>
        <View style={styles.modeRow}>
          {[['dark', '🌙 Escuro'], ['light', '☀️ Claro']].map(([m, label]) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnOn]}
              onPress={() => trocarModo(m)}
              disabled={reloading}>
              {reloading && mode === m
                ? <ActivityIndicator size="small" color={T.accent} />
                : <Text style={[styles.modeText, mode === m && { color: T.accent, fontWeight: '800' }]}>{label}</Text>}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.hint}>Vale pro app todo — o app reinicia em ~1s pra aplicar. O feed de vídeos continua escuro, como todo player vertical.</Text>

        {/* Estilos */}
        <Text style={styles.section}>Estilo do BlueChat</Text>
        <Text style={styles.hint}>Cada estilo muda a cor, o formato dos ícones e a fonte das conversas.</Text>
        {Object.entries(CHAT_THEMES).map(([key, th]) => {
          const on = chatTheme === key;
          const m = MODES[mode];
          return (
            <TouchableOpacity key={key} style={[styles.card, on && { borderColor: th.accent, borderWidth: 2 }]} onPress={() => setChatTheme(key)}>
              <View style={styles.cardHead}>
                <Text style={styles.cardEmoji}>{th.emoji}</Text>
                <Text style={[styles.cardNome, { fontFamily: th.font }]}>{th.nome}</Text>
                <Ionicons name={themedIcon('chatbubble', th.icons)} size={17} color={th.accent} style={{ marginLeft: 'auto' }} />
                {on && <Ionicons name="checkmark-circle" size={20} color={th.accent} style={{ marginLeft: 8 }} />}
              </View>
              {/* Preview de bolhas */}
              <View style={styles.preview}>
                <View style={[styles.bOther, { backgroundColor: m.bubbleOther }]}>
                  <Text style={[styles.bOtherText, { color: m.bubbleOtherText, fontFamily: th.font }]}>E aí, viu meu status?</Text>
                </View>
                <View style={[styles.bMe, { backgroundColor: th.bubbleMe }]}>
                  <Text style={[styles.bMeText, { color: th.bubbleText, fontFamily: th.font }]}>Vi! Ficou 🔥</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const mkStyles = (T) => StyleSheet.create({
  section: { color: T.textDim, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 18, marginBottom: 8 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: T.card, borderWidth: 1, borderColor: T.border },
  modeBtnOn: { backgroundColor: T.accent + '1f' },
  modeText: { color: T.textSecondary, fontSize: 14, fontWeight: '600' },
  hint: { color: T.textDim, fontSize: 11.5, lineHeight: 16, marginTop: 8 },
  card: { marginTop: 12, borderRadius: 16, padding: 14, backgroundColor: T.card, borderWidth: 1, borderColor: T.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardEmoji: { fontSize: 18 },
  cardNome: { color: T.text, fontSize: 15, fontWeight: '700' },
  preview: { gap: 6 },
  bOther: { alignSelf: 'flex-start', borderRadius: 14, borderBottomLeftRadius: 4, paddingHorizontal: 12, paddingVertical: 8, maxWidth: '75%' },
  bOtherText: { fontSize: 13 },
  bMe: { alignSelf: 'flex-end', borderRadius: 14, borderBottomRightRadius: 4, paddingHorizontal: 12, paddingVertical: 8, maxWidth: '75%' },
  bMeText: { fontSize: 13 },
});
