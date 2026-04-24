import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export const useAuthStore = create((set) => ({
  token: null,
  user: null,
  introSeen: false,
  isLoading: true,
  setToken: async (token) => {
    if (token) await SecureStore.setItemAsync('bt_token', token);
    else await SecureStore.deleteItemAsync('bt_token');
    set({ token });
  },
  setUser: (user) => set({ user }),
  markIntroSeen: async () => {
    await SecureStore.setItemAsync('bt_intro_visto', '1').catch(() => {});
    set({ introSeen: true });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('bt_token');
    await SecureStore.deleteItemAsync('bt_refresh_token');
    set({ token: null, user: null });
  },
  init: async () => {
    // Fix 1 PII (auditoria 2026-04-24): valida token salvo no startup.
    // Se invalido (401/403), tenta refresh via bt_refresh_token (auto-login
    // sem precisar de senha). Substitui o esquema antigo de bt_last_password
    // que era inseguro (Lote 2 commit 57c7a7e revertido aqui).
    try {
      const [token, refresh, introFlag, oldPassword] = await Promise.all([
        SecureStore.getItemAsync('bt_token'),
        SecureStore.getItemAsync('bt_refresh_token'),
        SecureStore.getItemAsync('bt_intro_visto'),
        SecureStore.getItemAsync('bt_last_password'),
      ]);

      // CLEANUP MIGRATION: bt_last_password era armazenado pelo Lote 2
      // (commit 57c7a7e), depois auditoria PII de 2026-04-24 marcou como
      // risco de vazamento se Keystore for dumped. Remove silenciosamente
      // em qualquer device que ainda tenha. Log SEM PII.
      if (oldPassword) {
        SecureStore.deleteItemAsync('bt_last_password').catch(() => {});
        console.log('[migration] bt_last_password removed from SecureStore');
      }

      // Sem token nem refresh — nao logado, vai pra LoginScreen
      if (!token && !refresh) {
        set({ token: null, introSeen: introFlag === '1', isLoading: false });
        return;
      }

      let validToken = token;
      let validUser = null;

      // Tenta validar token atual
      if (token) {
        try {
          const { SUPABASE_URL, SUPABASE_ANON_KEY } = require('../constants');
          const uR = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token },
          });
          if (uR.ok) {
            validUser = await uR.json();
          } else if (uR.status === 401 || uR.status === 403) {
            // Token rejeitado pelo Supabase → tenta refresh
            validToken = null;
          } else if (uR.status >= 500) {
            // Supabase com problema de infra → mantem token salvo, valida
            // no proximo request normal do app. Nao forca re-login durante
            // incidente de infra do Supabase.
            console.warn('[init] Supabase 5xx, mantendo token salvo');
          }
        } catch (e) {
          // Network error (timeout, offline, DNS) → mantem token salvo
          console.warn('[init] network error validando token, mantendo salvo');
        }
      }

      // Se token foi invalidado mas existe refresh → tenta trocar
      if (!validToken && refresh) {
        const { refreshSession } = require('../api');
        const rs = await refreshSession(refresh);
        if (rs?.access_token) {
          validToken = rs.access_token;
          validUser = rs.user || null;
          await SecureStore.setItemAsync('bt_token', rs.access_token).catch(() => {});
          if (rs.refresh_token) {
            await SecureStore.setItemAsync('bt_refresh_token', rs.refresh_token).catch(() => {});
          }
        } else {
          // Refresh tambem expirou — limpa tudo, vai pra LoginScreen
          await SecureStore.deleteItemAsync('bt_token').catch(() => {});
          await SecureStore.deleteItemAsync('bt_refresh_token').catch(() => {});
        }
      }

      set({
        token: validToken || null,
        user: validUser,
        introSeen: introFlag === '1',
        isLoading: false,
      });
    } catch (e) {
      console.error('[useAuthStore.init] erro:', e?.message || e);
      set({ isLoading: false });
    }
  },
}));

export const useFeedStore = create((set) => ({
  videos: [],
  cursor: null,
  hasMore: true,
  isLoading: false,
  currentIndex: 0,
  // Lote 7 — feed infinito: rastreia modo do backend (fresh|seen_recycle)
  // pra disparar banner sutil na transicao.
  feedMode: 'fresh',
  setVideos: (videos) => set({ videos }),
  addVideos: (videos) => set((s) => ({ videos: [...s.videos, ...videos] })),
  setCursor: (cursor) => set({ cursor }),
  setHasMore: (hasMore) => set({ hasMore }),
  setLoading: (isLoading) => set({ isLoading }),
  setCurrentIndex: (i) => set({ currentIndex: i }),
  setFeedMode: (m) => set({ feedMode: m }),
  reset: () => set({ videos: [], cursor: null, hasMore: true, currentIndex: 0, feedMode: 'fresh' }),
}));
