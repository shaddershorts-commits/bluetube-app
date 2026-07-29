// GlassMenu — menu suspenso "liquid glass" (BlurView) estilo bottom sheet.
// Usado no long-press de conversas (fixar/apagar/bloquear) e mensagens
// (apagar pra mim / apagar envio / editar).
// options: [{ icon, label, danger?, onPress }] — itens falsy são ignorados.
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

export default function GlassMenu({ visible, title, subtitle, options = [], onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheetWrap} onPress={(e) => e.stopPropagation()}>
          <BlurView intensity={50} tint={COLORS.glassTint} style={styles.sheet}>
            <View style={styles.handle} />
            {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
            {options.filter(Boolean).map((o, i) => (
              <TouchableOpacity
                key={o.label + i}
                style={[styles.opt, i > 0 && styles.optBorder]}
                onPress={() => { onClose(); setTimeout(() => o.onPress && o.onPress(), 130); }}
              >
                <Ionicons name={o.icon} size={20} color={o.danger ? '#f87171' : COLORS.neon} />
                <Text style={[styles.optLabel, o.danger && { color: '#f87171' }]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.opt, styles.optBorder]} onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.onGlassDim} />
              <Text style={[styles.optLabel, { color: COLORS.onGlassDim }]}>Cancelar</Text>
            </TouchableOpacity>
          </BlurView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Todas as cores saem de COLORS.* (tokens de superfície) — no tema claro o
// vidro fica claro E o texto escuro. Antes: vidro fixo escuro + optLabel
// '#e8f0fb' fixo, com title/subtitle em COLORS.text (preto no claro) = sumia.
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  sheetWrap: { padding: 12 },
  sheet: {
    borderRadius: 24, overflow: 'hidden', paddingBottom: 8,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glassBg,
  },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: COLORS.onGlassDim, alignSelf: 'center', marginTop: 10 },
  title: { color: COLORS.onGlass, fontSize: 15, fontWeight: '800', textAlign: 'center', marginTop: 10, paddingHorizontal: 20 },
  subtitle: { color: COLORS.onGlassDim, fontSize: 11.5, textAlign: 'center', marginTop: 2, paddingHorizontal: 20 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 22, marginTop: 4 },
  optBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.hairline },
  optLabel: { color: COLORS.onGlass, fontSize: 15, fontWeight: '600' },
});
