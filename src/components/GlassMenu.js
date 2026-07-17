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
          <BlurView intensity={50} tint={COLORS.mode === 'light' ? 'light' : 'dark'} style={styles.sheet}>
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
              <Ionicons name="close" size={20} color={COLORS.textDim} />
              <Text style={[styles.optLabel, { color: COLORS.textDim }]}>Cancelar</Text>
            </TouchableOpacity>
          </BlurView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(2,8,23,0.55)', justifyContent: 'flex-end' },
  sheetWrap: { padding: 12 },
  sheet: {
    borderRadius: 24, overflow: 'hidden', paddingBottom: 8,
    borderWidth: 1, borderColor: 'rgba(0,170,255,0.25)',
    backgroundColor: 'rgba(10,22,40,0.55)',
  },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: COLORS.textDim, alignSelf: 'center', marginTop: 10 },
  title: { color: COLORS.text, fontSize: 15, fontWeight: '800', textAlign: 'center', marginTop: 10, paddingHorizontal: 20 },
  subtitle: { color: COLORS.textDim, fontSize: 11.5, textAlign: 'center', marginTop: 2, paddingHorizontal: 20 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 22, marginTop: 4 },
  optBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.08)' },
  optLabel: { color: '#e8f0fb', fontSize: 15, fontWeight: '600' },
});
