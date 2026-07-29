import Constants from 'expo-constants';
import { applyThemeTokens } from './theme';

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
  // ── Tokens de SUPERFÍCIE (auditoria tema claro 2026-07-29) ───────────────
  // Antes, menus/sheets/headers em "liquid glass" tinham fundo e texto FIXOS
  // escuros. No tema claro o fundo continuava escuro mas o texto virava
  // COLORS.text (quase preto) => texto invisível. Agora a superfície inteira
  // acompanha o modo: tint do BlurView, cor do vidro, borda, texto sobre vidro
  // e divisórias saem daqui. Regra: NUNCA hardcodar branco/preto em superfície
  // que aparece nos dois modos — usar estes tokens.
  glassTint: 'dark',                      // prop `tint` do BlurView
  glassBg: 'rgba(10,22,40,0.55)',         // tinta por cima do blur
  glassBorder: 'rgba(255,255,255,0.12)',
  onGlass: '#e8f0fb',                     // texto principal sobre vidro
  onGlassDim: 'rgba(232,240,251,0.6)',    // texto secundário sobre vidro
  hairline: 'rgba(255,255,255,0.08)',     // divisórias / bordas sutis
  overlay: 'rgba(2,8,23,0.55)',           // backdrop de modal
  chipBg: 'rgba(0,170,255,0.08)',         // pílulas / cards de destaque
  chipBorder: 'rgba(0,170,255,0.28)',
  inputBg: 'rgba(255,255,255,0.06)',
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
  glassTint: 'light',
  glassBg: 'rgba(255,255,255,0.82)',
  glassBorder: 'rgba(26,107,255,0.22)',
  onGlass: '#0b1526',
  onGlassDim: 'rgba(11,21,38,0.6)',
  hairline: 'rgba(11,21,38,0.10)',
  overlay: 'rgba(11,21,38,0.32)',
  chipBg: 'rgba(26,107,255,0.07)',
  chipBorder: 'rgba(26,107,255,0.25)',
  inputBg: 'rgba(11,21,38,0.05)',
};

export const COLORS = { ...DARK };
export const COLORS_DARK = Object.freeze({ ...DARK });
export function applyMode(mode) {
  const alvo = mode === 'light' ? LIGHT : DARK;
  for (const k of Object.keys(alvo)) COLORS[k] = alvo[k];
  // Paleta do design system (Header, GlassCard/Button, sheets) segue junto —
  // antes ficava travada no escuro e produzia texto claro sobre fundo claro.
  applyThemeTokens(alvo.mode);
}

// Re-export do theme novo pra conveniencia (import unico):
export * from './theme';

export const API_BASE = Constants.expoConfig?.extra?.apiBaseUrl || 'https://bluetubeviral.com/api';
export const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || 'https://pokpfvjrccviwgguwuck.supabase.co';
// Fallback EMBUTIDO (fix 2026-07-24, raiz do "login inválido"/"desloga"): a
// key vinha do .env via extra no BUILD — mas .env é gitignored e a key chegava
// VAZIA no app → TODAS as chamadas ao Supabase Auth (login direto, validação
// de boot, refresh) morriam com "No API key found". A anon key é PÚBLICA por
// design (vai em qualquer bundle web; RLS protege os dados).
export const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBva3BmdmpyY2N2aXdnZ3V3dWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MzUwNTQsImV4cCI6MjA5MDMxMTA1NH0.x7h7l4jsnlCkjVSNa9G2Nv1BhcRXcM0rLEQwhX2ivak';

export const FONTS = {
  regular: 'System',
  bold: 'System',
  mono: 'Courier New',
};
