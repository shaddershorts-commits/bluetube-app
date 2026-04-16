import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants';
import blueAPI from '../api';

export default function PopupBoasVindas({ visible, username, onClose }) {
  const [stats, setStats] = useState(null);
  const emojiScale = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(40)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    emojiScale.setValue(0);
    cardY.setValue(40);
    cardOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(cardY, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(120),
        Animated.spring(emojiScale, { toValue: 1, tension: 120, friction: 6, useNativeDriver: true }),
      ]),
    ]).start();

    blueAPI.stats().then((d) => { if (d && !d.error) setStats(d); }).catch(() => {});
  }, [visible]);

  const line = stats
    ? (stats.videos_hoje != null
        ? `🔥 ${stats.videos_hoje} vídeos foram publicados hoje`
        : stats.lives_ativas != null
          ? `⚡ ${stats.lives_ativas} criadores estão ao vivo agora`
          : 'Seu feed está atualizado em tempo real')
    : 'Carregando novidades…';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardY }] }]}
          onStartShouldSetResponder={() => true}
        >
          <LinearGradient colors={['rgba(26,107,255,0.18)', 'rgba(0,170,255,0.08)']} style={styles.gradient}>
            <Animated.Text style={[styles.emoji, { transform: [{ scale: emojiScale }] }]}>🚀</Animated.Text>
            <Text style={styles.title}>{username ? `Bem-vindo, @${username}!` : 'Bem-vindo ao Blue!'}</Text>
            <Text style={styles.line}>{line}</Text>
            <TouchableOpacity activeOpacity={0.85} onPress={onClose} style={styles.ctaWrap}>
              <LinearGradient colors={[COLORS.primary, COLORS.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
                <Text style={styles.ctaText}>Ver o que há de novo →</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.skip}>
              <Text style={styles.skipText}>Ir para o feed</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 360, borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(0,170,255,0.25)',
  },
  gradient: { padding: 28, backgroundColor: 'rgba(10,22,40,0.95)', alignItems: 'center' },
  emoji: { fontSize: 72, marginBottom: 14 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  line: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 22, lineHeight: 20 },
  ctaWrap: { width: '100%', borderRadius: 12 },
  cta: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  skip: { marginTop: 12, padding: 8 },
  skipText: { color: COLORS.textSecondary, fontSize: 13 },
});
