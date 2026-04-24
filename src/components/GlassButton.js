// src/components/GlassButton.js
// ───────────────────────────────────────────────────────────────────────────
// Botao com efeito glass (BlurView) + press feedback animado.
// Variantes:
//   primary  → gradient azul (default, sem blur — destaque)
//   glass    → BlurView + borda translucida (acoes secundarias)
//   ghost    → so borda fina (acoes terciarias)
// ───────────────────────────────────────────────────────────────────────────

import { useRef } from 'react';
import { Pressable, Text, View, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, space, fontSize, fontWeight, blur as blurT, shadow } from '../constants/theme';

export default function GlassButton({
  children,
  onPress,
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  icon = null, // elemento JSX opcional (Ionicons etc)
  style,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.96, speed: 50, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, speed: 50, useNativeDriver: true }).start();
  };

  const content = (
    <View style={styles.row}>
      {icon}
      <Text style={[
        styles.label,
        variant === 'primary' && styles.labelPrimary,
        variant === 'glass' && styles.labelGlass,
        variant === 'ghost' && styles.labelGhost,
        disabled && styles.labelDisabled,
      ]}>{children}</Text>
    </View>
  );

  return (
    <Animated.View style={[{ transform: [{ scale }] }, fullWidth && styles.fullWidth, style]}>
      <Pressable
        onPress={disabled ? null : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[styles.base, fullWidth && styles.fullWidth]}>
        {variant === 'primary' && (
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.primaryBg]}
          />
        )}
        {variant === 'glass' && (
          <>
            <BlurView intensity={blurT.medium} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassDark }]} pointerEvents="none" />
          </>
        )}
        {variant !== 'primary' && (
          <View style={[StyleSheet.absoluteFill, { borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderGlass }]} pointerEvents="none" />
        )}
        {content}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    ...shadow.sm,
  },
  fullWidth: { width: '100%' },
  primaryBg: { borderRadius: radius.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  label: { fontSize: fontSize.base, fontWeight: fontWeight.bold, letterSpacing: 0.3 },
  labelPrimary: { color: '#fff' },
  labelGlass:   { color: colors.text },
  labelGhost:   { color: colors.textDim },
  labelDisabled: { opacity: 0.4 },
});
