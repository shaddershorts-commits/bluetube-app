// src/components/GlassCard.js
// ───────────────────────────────────────────────────────────────────────────
// Wrapper visual padrao do design system Liquid Glass.
// Usa BlurView do expo-blur + borda branca translucida (Apple-style).
//
// Props:
//   intensity:    blur intensity (default: blur.medium = 50)
//   tint:         'dark'|'light'|'default' (default: 'dark')
//   tone:         'glass'|'accent' — adiciona tint azul Blue se 'accent' (default: 'glass')
//   padded:       wrapping com space.lg de padding (default: true)
//   bordered:     borda translucida (default: true)
//   style:        override de estilos do wrapper
// ───────────────────────────────────────────────────────────────────────────

import { BlurView } from 'expo-blur';
import { View, StyleSheet } from 'react-native';
import { colors, radius, blur as blurT, space } from '../constants/theme';

export default function GlassCard({
  children,
  intensity = blurT.medium,
  tint = 'dark',
  tone = 'glass',
  padded = true,
  bordered = true,
  style,
}) {
  return (
    <View style={[
      styles.wrap,
      bordered && styles.bordered,
      style,
    ]}>
      <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
      {/* Tint colorido por cima do blur (Apple-style) */}
      <View style={[
        StyleSheet.absoluteFill,
        { backgroundColor: tone === 'accent' ? colors.glassAccent : colors.glassDark },
      ]} pointerEvents="none" />
      <View style={padded && styles.padded}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  bordered: {
    borderWidth: 1,
    borderColor: colors.borderGlass,
  },
  padded: {
    padding: space.lg,
  },
});
