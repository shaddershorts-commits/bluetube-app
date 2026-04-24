// src/constants/theme.js
// ───────────────────────────────────────────────────────────────────────────
// Design tokens centralizados — Liquid Glass design system (Lote 8).
// Preserva tons azuis Blue. Compativel com COLORS antigo via constants/index.js
// que continua exportando `COLORS` como alias pra `colors`.
//
// Use:
//   import { colors, space, radius, blur } from '../constants/theme';
// ou (legado, ainda funciona):
//   import { COLORS } from '../constants';
// ───────────────────────────────────────────────────────────────────────────

export const colors = {
  // Backgrounds
  bg:           '#020817',                          // negro azulado profundo (raiz)
  bgSecondary:  '#0a1628',                          // surface escuro
  bgRaised:     '#0f1f3a',                          // cards/modais 1-nivel acima

  // Glass tints (overlays translucidos pra BlurView)
  glassDark:    'rgba(10, 22, 40, 0.55)',           // base dos blur views (cards/modais)
  glassLight:   'rgba(255, 255, 255, 0.04)',        // hover sutil em items
  glassAccent:  'rgba(0, 170, 255, 0.08)',          // tom azul Blue sutil
  glassPress:   'rgba(255, 255, 255, 0.10)',        // press feedback em botoes glass

  // Text
  text:         '#e8f4ff',                          // primario
  textDim:      'rgba(232, 244, 255, 0.65)',        // secundario
  textMuted:    'rgba(232, 244, 255, 0.4)',         // terciario / hint
  textDisabled: 'rgba(232, 244, 255, 0.25)',

  // Brand
  primary:      '#1a6bff',                          // botao primario
  accent:       '#00aaff',                          // accents, links, focus
  neon:         '#3b82f6',                          // ativo em tabs/CTAs

  // States
  success:      '#22c55e',
  warning:      '#fbbf24',
  error:        '#ef4444',
  red:          '#ef4444',                          // alias compat
  gold:         '#FFD700',

  // Borders
  border:       'rgba(255, 255, 255, 0.08)',        // borda padrao escura
  borderActive: 'rgba(0, 170, 255, 0.4)',           // borda focus
  borderGlass:  'rgba(255, 255, 255, 0.12)',        // borda glass (Apple-style — branca translucida)
};

// SPACING (escala 8px)
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

// RADIUS
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 100,
  full: 9999,
};

// TYPOGRAPHY
export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 36,
};

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

// SHADOWS (4 niveis + glow)
export const shadow = {
  sm:  { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4,  shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  md:  { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8,  shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  lg:  { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  glow:{ shadowColor: '#00aaff', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
};

// BLUR (intensidades padronizadas pra BlurView do expo-blur)
export const blur = {
  light: 25,    // overlays sutis
  medium: 50,   // cards principais
  heavy: 80,    // modais
};

export const blurTint = 'dark'; // padrao pra todos os BlurViews
