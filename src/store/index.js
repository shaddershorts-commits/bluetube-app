import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export const useAuthStore = create((set) => ({
  token: null,
  user: null,
  introSeen: false,
  isLoading: true,
  // Usuários bloqueados (moderação UGC) — filtro client-side em comentários/chat;
  // o feed já é filtrado no servidor. Carregado após login (loadBlocked).
  blockedIds: [],
  addBlocked: (id) => set((s) => ({ blockedIds: s.blockedIds.includes(id) ? s.blockedIds : [...s.blockedIds, id] })),
  removeBlocked: (id) => set((s) => ({ blockedIds: s.blockedIds.filter((b) => b !== id) })),
  loadBlocked: async () => {
    try {
      const { default: blueAPI } = require('../api');
      const d = await blueAPI.bloqueados();
      set({ blockedIds: (d?.bloqueados || []).map((b) => b.bloqueado_id) });
    } catch (e) {}
  },
  setToken: async (token) => {
    if (token) await SecureStore.setItemAsync('bt_token', token);
    else await SecureStore.deleteItemAsync('bt_token');
    set({ token });
  },
  // Refresh PROATIVO (chamado quando o app volta pro 1º plano): renova o
  // access token (vida ~1h) — "logou uma vez, fica pra sempre" (Instagram).
  // Throttle de 5min; só desloga se o Supabase disser que o refresh é inválido.
  refreshNow: async () => {
    try {
      const now = Date.now();
      if (now - (globalThis.__btLastRefresh || 0) < 5 * 60 * 1000) return;
      globalThis.__btLastRefresh = now;
      const refresh = await SecureStore.getItemAsync('bt_refresh_token');
      if (!refresh) return;
      const { refreshSession } = require('../api');
      const rs = await refreshSession(refresh);
      if (rs?.access_token) {
        await SecureStore.setItemAsync('bt_token', rs.access_token).catch(() => {});
        if (rs.refresh_token) await SecureStore.setItemAsync('bt_refresh_token', rs.refresh_token).catch(() => {});
        set({ token: rs.access_token, ...(rs.user ? { user: rs.user } : {}) });
      } else if (rs?.invalid) {
        await SecureStore.deleteItemAsync('bt_token').catch(() => {});
        await SecureStore.deleteItemAsync('bt_refresh_token').catch(() => {});
        set({ token: null, user: null });
      }
      // null (rede/infra) = mantém como está; tenta de novo no próximo foreground
    } catch (e) {}
  },
  setUser: (user) => set({ user }),
  markIntroSeen: async () => {
    await SecureStore.setItemAsync('bt_intro_visto', '1').catch(() => {});
    set({ introSeen: true });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('bt_token').catch(() => {});
    await SecureStore.deleteItemAsync('bt_refresh_token').catch(() => {});
    // Resíduo do usuário anterior (aparelho compartilhado): a senha salva NÃO
    // pode sobrar no cofre, e o feed/bloqueados do outro user não podem vazar.
    await SecureStore.deleteItemAsync('bt_saved_password').catch(() => {});
    try { useFeedStore.getState().reset(); } catch (_) {}
    // NÃO chamar unregisterPush aqui: ele grava bt_push_off e o login não limpa
    // esse flag → desligaria o push no próximo login. O mapeamento no servidor é
    // sobrescrito quando o próximo usuário registra (register() no login).
    set({ token: null, user: null, sessaoNaoVerificada: false, blockedIds: [] });
  },

  // Tira o app do limbo "token sem usuário" (ver ANTI-ZUMBI no init).
  // Chamada 4s depois do boot degradado e a cada volta pro foreground.
  // Três desfechos, todos SAINDO do limbo:
  //   ok            → preenche o usuário e segue logado
  //   token morto   → logout limpo, a tela de login aparece
  //   rede ainda ruim → continua degradado e tenta de novo depois
  revalidar: async () => {
    const { token, sessaoNaoVerificada } = useAuthStore.getState();
    if (!token || !sessaoNaoVerificada) return;
    try {
      const { SUPABASE_URL, SUPABASE_ANON_KEY } = require('../constants');
      const { fetchComTimeout } = require('../api');
      const r = await fetchComTimeout(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token },
      }, 3500);
      if (r.ok) {
        const u = await r.json();
        set({ user: u, sessaoNaoVerificada: false });
        useAuthStore.getState().loadBlocked?.();
        return;
      }
      if (r.status === 401 || r.status === 403) {
        // tenta uma última troca pelo refresh antes de desistir
        const refresh = await SecureStore.getItemAsync('bt_refresh_token').catch(() => null);
        if (refresh) {
          const { refreshSession } = require('../api');
          const rs = await refreshSession(refresh, 6000);
          if (rs?.access_token) {
            await SecureStore.setItemAsync('bt_token', rs.access_token).catch(() => {});
            if (rs.refresh_token) await SecureStore.setItemAsync('bt_refresh_token', rs.refresh_token).catch(() => {});
            set({ token: rs.access_token, user: rs.user || null, sessaoNaoVerificada: !rs.user });
            return;
          }
        }
        // token realmente morto: logout limpo — melhor pedir login do que
        // deixar o app parecendo quebrado
        await useAuthStore.getState().logout();
      }
      // 5xx / outros: segue degradado, tenta na próxima
    } catch (e) { /* rede ainda ruim: tenta na próxima */ }
  },
  init: async () => {
    // REDE DE SEGURANÇA: aconteça o que acontecer (qualquer await que pendure),
    // o splash sai em até 5s. Os fetches já têm timeout de 3.5s; isto é a última
    // linha de defesa pra NUNCA travar na tela de abertura.
    const _netSafety = setTimeout(() => {
      if (useAuthStore.getState().isLoading) {
        console.warn('[init] rede de segurança: forçando isLoading=false');
        set({ isLoading: false });
      }
    }, 10000);
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
          const { fetchComTimeout } = require('../api');
          // Timeout 3.5s: em rede ruim a validação NÃO pode pendurar o splash.
          // Se estourar, cai no catch abaixo → mantém o token salvo (otimista).
          const uR = await fetchComTimeout(`${SUPABASE_URL}/auth/v1/user`, {
            headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token },
          }, 3500);
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
        const rs = await refreshSession(refresh, 6000);
        if (rs?.access_token) {
          validToken = rs.access_token;
          validUser = rs.user || null;
          await SecureStore.setItemAsync('bt_token', rs.access_token).catch(() => {});
          if (rs.refresh_token) {
            await SecureStore.setItemAsync('bt_refresh_token', rs.refresh_token).catch(() => {});
          }
        } else if (rs?.invalid) {
          // Supabase disse EXPLICITAMENTE que o refresh morreu (revogado/expirado)
          // — só AQUI desloga. Vai pra LoginScreen.
          await SecureStore.deleteItemAsync('bt_token').catch(() => {});
          await SecureStore.deleteItemAsync('bt_refresh_token').catch(() => {});
        } else {
          // Falha de REDE/infra no refresh (comum no cold start: o app abre
          // antes do rádio/Wi-Fi acordar). NUNCA desloga por isso — mantém a
          // sessão otimista com o token salvo; o refresh de foreground
          // (refreshNow) conserta assim que a rede volta. Fix do bug
          // "fecho e abro e desloga" (user 2026-07-24, padrão Instagram).
          validToken = token;
        }
      }

      // ── ANTI-ZUMBI (fix 06/08/2026) ────────────────────────────────────
      // Bug relatado: "abri o app, deslogou, não aparece vídeo nenhum, não
      // aparece opção de login, mas consigo editar o perfil".
      // Causa: quando o token expira E o refresh falha por REDE, o código
      // acima restaura o token velho (certo — não deslogar por falha de
      // rede), mas `validUser` fica NULL. O app então acredita estar logado
      // (isGuest() olha só o token, então libera Perfil/Editar) enquanto
      // TODA chamada autenticada devolve 401 — daí a tela vazia.
      // Agora esse estado é marcado como NÃO VERIFICADO, e quem precisa de
      // identidade real (isGuest) passa a exigir token E usuário.
      const naoVerificado = !!validToken && !validUser;
      if (naoVerificado) {
        console.warn('[init] sessão não verificada (token sem usuário) — modo degradado');
      }

      set({
        token: validToken || null,
        user: validUser,
        sessaoNaoVerificada: naoVerificado,
        introSeen: introFlag === '1',
        isLoading: false,
      });

      // CONTINGÊNCIA: tenta reverificar sozinho quando a rede voltar. Se o
      // token estiver de fato morto, `revalidar` faz logout limpo e a tela de
      // login aparece — em vez de deixar o app num limbo silencioso.
      if (naoVerificado) {
        setTimeout(() => { useAuthStore.getState().revalidar?.(); }, 4000);
      }
      // Lista de bloqueados (moderação) — fire-and-forget pós-login
      if (validToken) useAuthStore.getState().loadBlocked();
    } catch (e) {
      console.error('[useAuthStore.init] erro:', e?.message || e);
      set({ isLoading: false });
    } finally {
      clearTimeout(_netSafety);
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
  // App em foreground? (AppState) — pausa videos no background, senao o
  // audio continua tocando com o app minimizado no Android.
  appActive: true,
  setAppActive: (appActive) => set({ appActive }),
  // Mute GLOBAL do feed: silenciar um video vale pra todos os seguintes
  muted: false,
  setMuted: (muted) => set({ muted }),
  // user_ids com story ativo (alimentado pela StoriesBar) — anel azul no
  // avatar dentro do video + tap abre o story
  storyUsers: new Set(),
  setStoryUsers: (storyUsers) => set({ storyUsers }),
  setVideos: (videos) => set({ videos }),
  addVideos: (videos) => set((s) => ({ videos: [...s.videos, ...videos] })),
  setCursor: (cursor) => set({ cursor }),
  setHasMore: (hasMore) => set({ hasMore }),
  setLoading: (isLoading) => set({ isLoading }),
  setCurrentIndex: (i) => set({ currentIndex: i }),
  setFeedMode: (m) => set({ feedMode: m }),
  reset: () => set({ videos: [], cursor: null, hasMore: true, currentIndex: 0, feedMode: 'fresh' }),
}));
