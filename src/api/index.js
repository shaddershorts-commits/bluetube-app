import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { API_BASE } from '../constants';
import { addBreadcrumb, captureError } from '../utils/sentry';

async function getToken() {
    return await SecureStore.getItemAsync('bt_token');
}

async function api(endpoint, options = {}) {
    const url = `${API_BASE}/${endpoint}`;
    const method = options.method || 'GET';
    addBreadcrumb(`API ${method} ${endpoint.split('?')[0]}`, 'http', { method });
    try {
        const response = await fetch(url, {
              ...options,
              headers: {
                      'Content-Type': 'application/json',
                      ...options.headers,
              },
        });
        const text = await response.text();
        try { return JSON.parse(text); }
        catch { return { error: text, status: response.status }; }
    } catch (error) {
        captureError(error, { endpoint, method });
        return { error: error.message || 'network_error', status: 0 };
    }
}

export const blueAPI = {
    // Auth
    signin: (email, password) => api('auth', { method: 'POST', body: JSON.stringify({ action: 'signin', email, password }) }),
    signup: (email, password) => api('auth', { method: 'POST', body: JSON.stringify({ action: 'signup', email, password }) }),
    refresh: (refresh_token) => api('auth', { method: 'POST', body: JSON.stringify({ action: 'refresh', refresh_token }) }),

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

    // Interacoes
    interact: async (type, video_id, extra = {}) => {
          const token = await getToken();
          return api('blue-interact', { method: 'POST', body: JSON.stringify({ type, video_id, user_id: extra.user_id, session_id: extra.session_id || 'mobile', ...extra }) });
    },
    salvar: async (video_id) => {
          const token = await getToken();
          return api('blue-interact', { method: 'POST', body: JSON.stringify({ action: 'salvar', token, video_id }) });
    },
    notificacoes: async () => {
          const token = await getToken();
          return api('blue-interact', { method: 'POST', body: JSON.stringify({ action: 'notificacoes', token }) });
    },

    // Perfil
    perfil: async (user_id) => api(`blue-profile?user_id=${user_id}`),
    perfilPorUsername: async (username) => api(`blue-profile?username=${encodeURIComponent(username)}`),
    meuPerfil: async () => {
          const token = await getToken();
          return api(`blue-profile?token=${encodeURIComponent(token)}`);
    },
    meusVideos: async () => {
          const token = await getToken();
          return api(`blue-profile?action=my-videos&token=${encodeURIComponent(token)}`);
    },
    // Notificacoes do usuario logado (badge + lista). Retorna { notifications, unread }.
    notificacoes: async () => {
          const token = await getToken();
          return api(`blue-profile?action=notifications&token=${encodeURIComponent(token)}`);
    },
    marcarNotificacoesLidas: async () => {
          const token = await getToken();
          return api('blue-profile', { method: 'POST', body: JSON.stringify({ action: 'mark-notifications-read', token }) });
    },
    // Analytics do criador (visoes/curtidas/saves agregados + lista videos).
    analytics: async () => {
          const token = await getToken();
          return api(`blue-profile?action=analytics&token=${encodeURIComponent(token)}`);
    },
    // Videos salvos pelo usuario logado.
    meusSalvos: async () => {
          const token = await getToken();
          return api('blue-interact', { method: 'POST', body: JSON.stringify({ action: 'meus-salvos', token }) });
    },
    videosDoUsuario: async (user_id) => {
          return api(`blue-profile?action=user-videos&user_id=${encodeURIComponent(user_id)}`);
    },
    // Seguir / deixar de seguir um user. Backend descobre follower_id via token.
    seguir: async (target_id) => {
          const token = await getToken();
          if (!token) return { error: 'Login necessario' };
          return api('blue-follow', {
                method: 'POST',
                body: JSON.stringify({ action: 'follow', token, target_id }),
          });
    },
    deixarDeSeguir: async (target_id) => {
          const token = await getToken();
          if (!token) return { error: 'Login necessario' };
          return api('blue-follow', {
                method: 'POST',
                body: JSON.stringify({ action: 'unfollow', token, target_id }),
          });
    },
    // Retorna { following: boolean } — sigo esse user?
    estouSeguindo: async (user_id) => {
          const token = await getToken();
          if (!token) return { following: false };
          return api(`blue-follow?action=is-following&user_id=${encodeURIComponent(user_id)}&token=${encodeURIComponent(token)}`);
    },
    // TODO: blue-profile.js precisa ter action=sugestoes-seguir
    sugestoesSeguir: async () => {
          const token = await getToken();
          return api(`blue-profile?action=sugestoes-seguir&token=${encodeURIComponent(token)}`);
    },

    // Comentarios
    comentarios: (video_id) => api(`blue-comment?video_id=${video_id}&limit=50`),
    comentar: async (video_id, texto) => {
          const token = await getToken();
          return api('blue-comment', { method: 'POST', body: JSON.stringify({ action: 'create', video_id, content: texto, token }) });
    },

    // Chat
    conversas: async () => {
          const token = await getToken();
          return api(`blue-chat?action=conversations&token=${encodeURIComponent(token)}`);
    },
    mensagens: async (conversation_id) => {
          // Backend espera `conv_id` (nao `conversation_id`) — alinhado com web.
          const token = await getToken();
          return api(`blue-chat?action=messages&conv_id=${conversation_id}&token=${encodeURIComponent(token)}`);
    },
    enviarMensagem: async (conversation_id, content, receiver_id) => {
          // Backend espera `to_user_id` + `text` (nao `receiver_id` + `content`).
          // O `conversation_id` nao eh enviado — backend deriva do par sorted.
          const token = await getToken();
          return api('blue-chat', { method: 'POST', body: JSON.stringify({ action: 'send', to_user_id: receiver_id, text: content, token }) });
    },
    abrirConversa: async (with_user_id) => {
          // Cria-ou-pega conversa com outro user; retorna { conv_id, other }.
          // Usado pelo botao "Enviar mensagem" no PerfilUsuarioScreen pra abrir
          // ConversaScreen com conv_id real (sem isso, ConversaScreen nao tem
          // conv_id e qualquer GET messages falha).
          const token = await getToken();
          return api('blue-chat', { method: 'POST', body: JSON.stringify({ action: 'open-conv', with_user_id, token }) });
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
          return api('blue-onboarding', { method: 'POST', body: JSON.stringify({ action: 'interesses', token, interesses }) });
    },
    onboardingCompletar: async () => {
          const token = await getToken();
          return api('blue-onboarding', { method: 'POST', body: JSON.stringify({ action: 'completar', token }) });
    },

    // Reports + bloqueios
    reportar: async (tipo_alvo, alvo_id, motivo) => {
          const token = await getToken();
          return api('blue-report', { method: 'POST', body: JSON.stringify({ action: 'reportar', token, tipo_alvo, alvo_id, motivo }) });
    },
    bloquear: async (bloqueado_id) => {
          const token = await getToken();
          return api('blue-report', { method: 'POST', body: JSON.stringify({ action: 'bloquear', token, bloqueado_id }) });
    },

    // Monetizacao
    saldoCoins: async () => {
          const token = await getToken();
          return api(`blue-coins?action=saldo&token=${encodeURIComponent(token)}`);
    },
    monetizacaoStatus: async () => {
          const token = await getToken();
          return api(`blue-monetizacao?action=status&token=${encodeURIComponent(token)}`);
    },

    // Upload de video — fluxo 2-step:
    //   1) POST /api/blue-upload com metadata + thumbnail base64 -> recebe storage_path + creds
    //   2) PUT direto no Supabase Storage com o arquivo mp4/mov
    publicarVideo: async (videoUri, { titulo, descricao = '', duration = 30, onProgress } = {}) => {
          const token = await getToken();
          if (!token) return { error: 'Login necessario' };
          if (!videoUri) return { error: 'Video invalido' };

          addBreadcrumb('publicarVideo:start', 'upload', { duration });

          // File info
          let fileInfo;
          try {
                fileInfo = await FileSystem.getInfoAsync(videoUri);
          } catch (e) {
                captureError(e, { step: 'file-info' });
                return { error: 'Nao consegui ler o arquivo do video' };
          }
          if (!fileInfo?.exists) return { error: 'Arquivo nao encontrado' };

          const ext = (videoUri.split('.').pop() || 'mp4').toLowerCase();
          const contentType = ext === 'mov' ? 'video/quicktime' : ext === 'webm' ? 'video/webm' : 'video/mp4';

          // Thumbnail base64 (nao bloqueante se falhar — backend aceita null)
          let thumbnail_data = null;
          try {
                const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
                      time: Math.min(1000, (duration * 1000) / 4),
                      quality: 0.7,
                });
                const thumbB64 = await FileSystem.readAsStringAsync(thumbUri, {
                      encoding: FileSystem.EncodingType.Base64,
                });
                thumbnail_data = `data:image/jpeg;base64,${thumbB64}`;
          } catch (e) {
                // segue sem thumbnail — backend gera depois pelo Cloudflare Stream
          }

          // Step 1: registra metadata
          const metaResp = await api('blue-upload', {
                method: 'POST',
                body: JSON.stringify({
                      token,
                      title: titulo,
                      description: descricao,
                      duration,
                      width: 1080,
                      height: 1920,
                      file_name: `video.${ext}`,
                      content_type: contentType,
                      file_size: fileInfo.size,
                      thumbnail_data,
                }),
          });
          if (metaResp?.error) {
                captureError(new Error(metaResp.error), { step: 'metadata', status: metaResp.status });
                return { error: metaResp.error };
          }
          if (!metaResp?.ok || !metaResp?.storage_path) {
                return { error: 'Resposta invalida do servidor' };
          }

          // Step 2: upload binario direto pro Supabase Storage
          const uploadUrl = `${metaResp.supabase_url}/storage/v1/object/blue-videos/${metaResp.storage_path}`;
          const uploadTask = FileSystem.createUploadTask(
                uploadUrl,
                videoUri,
                {
                      httpMethod: 'POST',
                      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
                      headers: {
                            apikey: metaResp.anon_key,
                            Authorization: `Bearer ${metaResp.user_token}`,
                            'Content-Type': contentType,
                            'x-upsert': 'true',
                      },
                },
                (p) => {
                      if (onProgress && p.totalBytesExpectedToSend > 0) {
                            onProgress(p.totalBytesSent / p.totalBytesExpectedToSend);
                      }
                }
          );

          try {
                const uploadRes = await uploadTask.uploadAsync();
                if (uploadRes.status >= 400) {
                      captureError(new Error('upload_failed'), { status: uploadRes.status, body: uploadRes.body?.slice(0, 200) });
                      return { error: `Falha no upload (HTTP ${uploadRes.status})` };
                }
          } catch (e) {
                captureError(e, { step: 'storage-upload' });
                return { error: e.message || 'Falha no upload' };
          }

          if (onProgress) onProgress(1);
          addBreadcrumb('publicarVideo:ok', 'upload', { video_id: metaResp.video?.id });
          return { ok: true, video: metaResp.video };
    },

    // Edit perfil — action=update em blue-profile
    //   display_name: max 50 chars
    //   bio:          max 150 chars
    //   username:     lowercase a-z0-9_. (sluggified no backend), min 3 chars
    //   avatar_data:  data:image/jpeg;base64,... (max 2MB). Backend faz upload
    //                 pro Supabase Storage e devolve avatar_url.
    atualizarPerfil: async ({ display_name, bio, username, avatar_data } = {}) => {
          const token = await getToken();
          if (!token) return { error: 'Login necessario' };
          return api('blue-profile', {
                method: 'POST',
                body: JSON.stringify({
                      action: 'update',
                      token,
                      ...(display_name !== undefined && { display_name }),
                      ...(bio !== undefined && { bio }),
                      ...(username !== undefined && { username }),
                      ...(avatar_data !== undefined && { avatar_data }),
                }),
          });
    },
};

export default blueAPI;
