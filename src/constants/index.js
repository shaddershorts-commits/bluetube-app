import Constants from 'expo-constants';

// COLORS legado — mantido pra retrocompat com componentes antigos.
// Novos componentes devem usar `import { colors, space, radius, blur } from './theme'`.
// Veja src/constants/theme.js (Lote 8 — Liquid Glass design system).
export const COLORS = {
  background: '#020817',
  surface: '#0a1628',
  primary: '#1a6bff',
  accent: '#00aaff',
  neon: '#3b82f6',
  text: '#e8f4ff',
  textSecondary: 'rgba(232,244,255,0.5)',
  textDim: 'rgba(150,190,230,0.4)',
  border: 'rgba(0,170,255,0.15)',
  error: '#ff4444',
  success: '#22c55e',
  gold: '#FFD700',
  red: '#ef4444',
};

// Re-export do theme novo pra conveniencia (import unico):
export * from './theme';

export const API_BASE = Constants.expoConfig?.extra?.apiBaseUrl || 'https://bluetubeviral.com/api';
export const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || 'https://pokpfvjrccviwgguwuck.supabase.co';
export const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseKey || '';

export const FONTS = {
  regular: 'System',
  bold: 'System',
  mono: 'Courier New',
};
