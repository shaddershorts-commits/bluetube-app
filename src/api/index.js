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
    meuPerfil: async () => {
          const token = await getToken();
          return api(`blue-profile?token=${encodeURIComponent(token)}`);
    },
    meusVideos: async () => {
          const token = await getToken();
          return api(`blue-profile?action=my-videos&token=${encodeURIComponent(token)}`);
    },
    videosDoUsuario: async (user_id) => {
          return api(`blue-profile?action=user-videos&user_id=${encodeURIComponent(user_id)}`);
    },
    seguir: async (following_id, follower_id) => {
          return api('blue-follow', { method: 'POST', body: JSON.stringify({ action: 'toggle', following_id, follower_id }) });
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
          const token = await getToken();
          return api(`blue-chat?action=messages&conversation_id=${conversation_id}&token=${encodeURIComponent(token)}`);
    },
    enviarMensagem: async (conversation_id, content, receiver_id) => {
          const token = await getToken();
          return api('blue-chat', { method: 'POST', body: JSON.stringify({ action: 'send', conversation_id, content, receiver_id, token }) });
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

    // Edit perfil — PATCH em blue-profile
    atualizarPerfil: async ({ display_name, bio, avatar_url } = {}) => {
          const token = await getToken();
          if (!token) return { error: 'Login necessario' };
          return api('blue-profile', {
                method: 'POST',
                body: JSON.stringify({
                      action: 'atualizar',
                      token,
                      ...(display_name !== undefined && { display_name }),
                      ...(bio !== undefined && { bio }),
                      ...(avatar_url !== undefined && { avatar_url }),
                }),
          });
    },
};

export default blueAPI;
