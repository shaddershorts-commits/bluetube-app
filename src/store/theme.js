// Temas do BlueChat + modo Claro/Escuro.
// - CHAT_THEMES: muda cor de destaque, bolhas, família de fonte e estilo de
//   ícones (Ionicons: filled | outline | sharp) nas telas do BlueChat.
// - MODES: paleta clara/escura aplicada nas superfícies conversacionais
//   (BlueChat, Configurações). O feed de vídeo permanece escuro por design
//   (padrão de players verticais).
// Persistência: SecureStore (bt_chat_theme / bt_app_mode).
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export const CHAT_THEMES = {
  blue:    { nome: 'Azul Blue',   emoji: '💙', accent: '#3b82f6', bubbleMe: '#1a6bff', bubbleText: '#fff', font: undefined,     icons: 'filled' },
  oceano:  { nome: 'Oceano',      emoji: '🌊', accent: '#06b6d4', bubbleMe: '#0e7490', bubbleText: '#fff', font: undefined,     icons: 'outline' },
  roxo:    { nome: 'Roxo Neon',   emoji: '💜', accent: '#a855f7', bubbleMe: '#7c3aed', bubbleText: '#fff', font: undefined,     icons: 'filled' },
  verde:   { nome: 'Esmeralda',   emoji: '💚', accent: '#22c55e', bubbleMe: '#15803d', bubbleText: '#fff', font: undefined,     icons: 'outline' },
  sunset:  { nome: 'Pôr do sol',  emoji: '🧡', accent: '#f97316', bubbleMe: '#ea580c', bubbleText: '#fff', font: undefined,     icons: 'filled' },
  rosa:    { nome: 'Rosa Vibe',   emoji: '🩷', accent: '#ec4899', bubbleMe: '#db2777', bubbleText: '#fff', font: undefined,     icons: 'sharp'  },
  mono:    { nome: 'Minimal',     emoji: '🤍', accent: '#94a3b8', bubbleMe: '#334155', bubbleText: '#fff', font: 'monospace',   icons: 'outline' },
  clássico:{ nome: 'Máquina',     emoji: '📜', accent: '#eab308', bubbleMe: '#713f12', bubbleText: '#fde68a', font: 'serif',    icons: 'sharp'  },
};

export const MODES = {
  dark: {
    background: '#020817', surface: '#0a1628', card: 'rgba(255,255,255,0.04)',
    text: '#e8f4ff', textSecondary: 'rgba(232,244,255,0.5)', textDim: 'rgba(150,190,230,0.4)',
    border: 'rgba(0,170,255,0.15)', input: 'rgba(255,255,255,0.06)', bubbleOther: '#0f1f38', bubbleOtherText: '#e8f4ff',
  },
  light: {
    background: '#eef3fa', surface: '#ffffff', card: 'rgba(11,21,38,0.04)',
    text: '#0b1526', textSecondary: 'rgba(11,21,38,0.55)', textDim: 'rgba(11,21,38,0.35)',
    border: 'rgba(26,107,255,0.18)', input: 'rgba(11,21,38,0.06)', bubbleOther: '#ffffff', bubbleOtherText: '#0b1526',
  },
};

export const useThemeStore = create((set) => ({
  chatTheme: 'blue',
  mode: 'dark',
  setChatTheme: (k) => {
    set({ chatTheme: CHAT_THEMES[k] ? k : 'blue' });
    SecureStore.setItemAsync('bt_chat_theme', k).catch(() => {});
  },
  setMode: (m) => {
    set({ mode: m === 'light' ? 'light' : 'dark' });
    SecureStore.setItemAsync('bt_app_mode', m).catch(() => {});
  },
  loadTheme: async () => {
    try {
      const [t, m] = await Promise.all([
        SecureStore.getItemAsync('bt_chat_theme'),
        SecureStore.getItemAsync('bt_app_mode'),
      ]);
      set({
        chatTheme: t && CHAT_THEMES[t] ? t : 'blue',
        mode: m === 'light' ? 'light' : 'dark',
      });
    } catch (e) { /* defaults */ }
  },
}));

// Hook único: tema do chat + paleta do modo, prontos pra usar.
export function useChatTheme() {
  const chatTheme = useThemeStore((s) => s.chatTheme);
  const mode = useThemeStore((s) => s.mode);
  const t = CHAT_THEMES[chatTheme] || CHAT_THEMES.blue;
  const m = MODES[mode] || MODES.dark;
  return { ...m, ...t, key: chatTheme, mode };
}

// Ícone no estilo do tema: base 'chatbubble' → 'chatbubble' | 'chatbubble-outline' | 'chatbubble-sharp'
export function themedIcon(base, icons) {
  if (icons === 'outline') return base + '-outline';
  if (icons === 'sharp') return base + '-sharp';
  return base;
}

// Carrega a preferência salva já no import (antes da primeira tela do chat)
useThemeStore.getState().loadTheme();
