import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../constants';

async function getToken() {
  return await SecureStore.getItemAsync('bt_token');
}

async function api(endpoint, options = {}) {
  const url = `${API_BASE}/${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { error: text, status: response.status }; }
}

export const blueAPI = {
  // Auth
  signin: (email, password) =>
    api('auth', { method: 'POST', body: JSON.stringify({ action: 'signin', email, password }) }),
  signup: (email, password) =>
    api('auth', { method: 'POST', body: JSON.stringify({ action: 'signup', email, password }) }),
  refresh: (refresh_token) =>
    api('auth', { method: 'POST', body: JSON.stringify({ action: 'refresh', refresh_token }) }),

  // Feed
  feed: async (cursor) => {
    const token = await getToken();
    const q = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
    const tk = token ? `&token=${encodeURIComponent(token)}` : '';
    return api(`blue-feed?limit=10${q}${tk}`);
  },
  trending: () => api('blue-feed?action=trending-hashtags'),
  hashtagFeed: (tag) => api(`blue-feed?action=hashtag-feed&hashtag=${encodeURIComponent(tag)}`),
  livesAtivas: () => api('blue-lives?action=lives-ativas'),
  stats: () => api('blue-feed?action=stats'),

  // Interações
  interact: async (type, video_id, extra = {}) => {
    const token = await getToken();
    return api('blue-interact', { method: 'POST',
      body: JSON.stringify({ type, video_id, user_id: extra.user_id, session_id: extra.session_id || 'mobile', ...extra }) });
  },
  salvar: async (video_id) => {
    const token = await getToken();
    return api('blue-interact', { method: 'POST',
      body: JSON.stringify({ action: 'salvar', token, video_id }) });
  },
  notificacoes: async () => {
    const token = await getToken();
    return api('blue-interact', { method: 'POST',
      body: JSON.stringify({ action: 'notificacoes', token }) });
  },

  // Perfil
  perfil: async (user_id) => api(`blue-profile?user_id=${user_id}`),
  meuPerfil: async () => {
    const token = await getToken();
    return api(`blue-profile?token=${encodeURIComponent(token)}`);
  },
  seguir: async (following_id, follower_id) => {
    return api('blue-follow', { method: 'POST',
      body: JSON.stringify({ action: 'toggle', following_id, follower_id }) });
  },

  // Comentários
  comentarios: (video_id) => api(`blue-comment?video_id=${video_id}&limit=50`),
  comentar: async (video_id, texto) => {
    const token = await getToken();
    return api('blue-comment', { method: 'POST',
      body: JSON.stringify({ action: 'create', video_id, content: texto, token }) });
  },

  // Chat
  conversas: async () => {
    const token = await getToken();
    return api(`blue-chat?action=conversations&token=${encodeURIComponent(token)}`);
  },
  mensagens: async (conversation_id) => {
    const token = await getToken();
    return api(`blue-chat?action=messages&conversation_id=${conversation_id}&token=${encodeURIComponent(token)}`);
  },
  enviarMensagem: async (conversation_id, content, receiver_id) => {
    const token = await getToken();
    return api('blue-chat', { method: 'POST',
      body: JSON.stringify({ action: 'send', conversation_id, content, receiver_id, token }) });
  },

  // Stories
  storiesFeed: async () => {
    const token = await getToken();
    return api(`blue-stories?action=feed&token=${encodeURIComponent(token)}`);
  },

  // Onboarding
  onboardingStatus: async () => {
    const token = await getToken();
    return api(`blue-onboarding?action=status&token=${encodeURIComponent(token)}`);
  },
  onboardingInteresses: async (interesses) => {
    const token = await getToken();
    return api('blue-onboarding', { method: 'POST',
      body: JSON.stringify({ action: 'interesses', token, interesses }) });
  },
  onboardingCompletar: async () => {
    const token = await getToken();
    return api('blue-onboarding', { method: 'POST',
      body: JSON.stringify({ action: 'completar', token }) });
  },

  // Reports + bloqueios
  reportar: async (tipo_alvo, alvo_id, motivo) => {
    const token = await getToken();
    return api('blue-report', { method: 'POST',
      body: JSON.stringify({ action: 'reportar', token, tipo_alvo, alvo_id, motivo }) });
  },
  bloquear: async (bloqueado_id) => {
    const token = await getToken();
    return api('blue-report', { method: 'POST',
      body: JSON.stringify({ action: 'bloquear', token, bloqueado_id }) });
  },

  // Monetização
  saldoCoins: async () => {
    const token = await getToken();
    return api(`blue-coins?action=saldo&token=${encodeURIComponent(token)}`);
  },
  monetizacaoStatus: async () => {
    const token = await getToken();
    return api(`blue-monetizacao?action=status&token=${encodeURIComponent(token)}`);
  },
};

export default blueAPI;
