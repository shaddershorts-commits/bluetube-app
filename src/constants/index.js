import Constants from 'expo-constants';

// COLORS — paleta GLOBAL dinâmica (claro/escuro).
// App.js chama applyMode() com a preferência salva ANTES de importar as telas,
// então os StyleSheet.create de todo o app capturam a paleta certa.
// Trocar o modo em runtime = salvar preferência + reload do JS (TemasScreen).
// Telas de vídeo (feed/player/stories/câmera/live) importam COLORS_DARK:
// player vertical é sempre escuro (texto branco sobre vídeo).
const DARK = {
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
  mode: 'dark',
};
const LIGHT = {
  ...DARK,
  background: '#eef3fa',
  surface: '#ffffff',
  neon: '#1a6bff',
  text: '#0b1526',
  textSecondary: 'rgba(11,21,38,0.6)',
  textDim: 'rgba(11,21,38,0.38)',
  border: 'rgba(26,107,255,0.22)',
  mode: 'light',
};

export const COLORS = { ...DARK };
export const COLORS_DARK = Object.freeze({ ...DARK });
export function applyMode(mode) {
  const alvo = mode === 'light' ? LIGHT : DARK;
  for (const k of Object.keys(alvo)) COLORS[k] = alvo[k];
}

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
