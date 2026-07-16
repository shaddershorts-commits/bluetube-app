import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { API_BASE, SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { addBreadcrumb, captureError } from '../utils/sentry';

async function getToken() {
    return await SecureStore.getItemAsync('bt_token');
}

// Fix 1 PII (auditoria 2026-04-24): refresh-token auto-login.
// Substitui o pre-preenchimento de senha (bt_last_password) por troca
// silenciosa de refresh_token por novo access_token. Chama Supabase Auth
// REST direto — nao depende de api/auth.js (intocavel).
// Retorna { access_token, refresh_token, user } ou null.
export async function refreshSession(refreshToken) {
    if (!refreshToken) return null;
    try {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!r.ok) return null;
        const d = await r.json();
        if (!d?.access_token) return null;
        return { access_token: d.access_token, refresh_token: d.refresh_token, user: d.user };
    } catch (e) {
        // network error / timeout / DNS — retorna null silencioso
        return null;
    }
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
    // GIFs (GIPHY) + figurinhas salvas
    gifSearch: async (q) => {
        const token = await getToken();
        return api(`blue-gifs?action=search&q=${encodeURIComponent(q || '')}&token=${encodeURIComponent(token || '')}`);
    },
    stickers: async () => {
        const token = await getToken();
        return api(`blue-gifs?action=stickers&token=${encodeURIComponent(token || '')}`);
    },
    saveSticker: async (url) => {
        const token = await getToken();
        return api('blue-gifs', { method: 'POST', body: JSON.stringify({ action: 'save-sticker', token, url }) });
    },
    delSticker: async (url) => {
        const token = await getToken();
        return api('blue-gifs', { method: 'POST', body: JSON.stringify({ action: 'del-sticker', token, url }) });
    },

    // Auth
    signin: (email, password) => api('auth', { method: 'POST', body: JSON.stringify({ action: 'signin', email, password }) }),
    signup: (email, password) => api('auth', { method: 'POST', body: JSON.stringify({ action: 'signup', email, password }) }),
    // DEAD CODE: blueAPI.refresh nunca e chamado. Refresh real e via refreshSession()
    // standalone (Fix 1, ec680c3) que vai direto pra Supabase Auth REST. Mantido por
    // compat. Se for chamar refresh, use refreshSession(). auth.js NAO tem action='refresh'.
    // TODO: remover quando confirmado que ninguem depende.
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
    // Video unico (VideoScreen nativa) — short-circuit do backend
    videoById: (id) => api(`blue-feed?video_id=${encodeURIComponent(id)}`),
    // Explorar: TODOS os videos do app (paginado por recencia), sem filtro de follow
    explore: (cursor) => api(`blue-feed?limit=24${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`),
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
    // Notificacoes do usuario logado. FIX 2026-07-14: blue-profile lia a
    // tabela LEGADA blue_notifications (inexistente, sempre []) — a viva e
    // blue_notificacoes via blue-interact. Retorna { notificacoes, unread }.
    notificacoes: async () => {
          const token = await getToken();
          return api('blue-interact', { method: 'POST', body: JSON.stringify({ action: 'notificacoes', token }) });
    },
    marcarNotificacoesLidas: async () => {
          const token = await getToken();
          return api('blue-interact', { method: 'POST', body: JSON.stringify({ action: 'marcar-lidas', token }) });
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
    // token no GET → traz liked_by_me por comentário
    comentarios: async (video_id) => {
          const token = await getToken();
          const tk = token ? `&token=${encodeURIComponent(token)}` : '';
          return api(`blue-comment?video_id=${video_id}&limit=200${tk}`);
    },
    // FIX 2026-07-14: backend espera campo `text` (nao `content`).
    // parent_id opcional = resposta a outro comentario.
    comentar: async (video_id, texto, parent_id) => {
          const token = await getToken();
          return api('blue-comment', { method: 'POST', body: JSON.stringify({ video_id, text: texto, token, parent_id: parent_id || null }) });
    },
    // Curtir/descurtir um comentario (toggle) → { liked, likes }
    curtirComentario: async (comment_id) => {
          const token = await getToken();
          return api('blue-comment', { method: 'POST', body: JSON.stringify({ action: 'like', comment_id, token }) });
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
    enviarMensagem: async (conversation_id, content, receiver_id, media) => {
          // Backend espera `to_user_id` + `text` (nao `receiver_id` + `content`).
          // O `conversation_id` nao eh enviado — backend deriva do par sorted.
          // media opcional: { url, type: 'image'|'video'|'audio'|'gif', duration }
          const token = await getToken();
          return api('blue-chat', { method: 'POST', body: JSON.stringify({
                action: 'send', to_user_id: receiver_id, text: content || '', token,
                ...(media?.url ? { media_url: media.url, media_type: media.type, media_duration: media.duration || null } : {}),
          }) });
    },
    // Upload de midia do chat pro bucket blue-videos. Path começa com o
    // userId (mesma convenção do upload de vídeo, que a policy do bucket
    // já aceita) — sub extraído do próprio JWT.
    uploadChatMedia: async (localUri, { ext = 'jpg', mime = 'image/jpeg' } = {}) => {
          const token = await getToken();
          if (!token) return { error: 'Login necessario' };
          try {
                let sub = 'anon';
                try { sub = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub || 'anon'; } catch (_) {}
                const pathStorage = sub + '/chat/' + Date.now() + '.' + ext;
                const url = `${SUPABASE_URL}/storage/v1/object/blue-videos/${pathStorage}`;
                const up = await FileSystem.uploadAsync(url, localUri, {
                      httpMethod: 'POST',
                      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
                      headers: {
                            apikey: SUPABASE_ANON_KEY,
                            Authorization: 'Bearer ' + token,
                            'Content-Type': mime,
                            'x-upsert': 'true',
                      },
                });
                if (up.status >= 400) return { error: 'Falha no upload (HTTP ' + up.status + ')' };
                return { url: `${SUPABASE_URL}/storage/v1/object/public/blue-videos/${pathStorage}` };
          } catch (e) { return { error: e.message || 'Falha no upload' }; }
    },
    // Presenca (online / visto por ultimo) + heartbeat
    presenca: async (user_id) => {
          const token = await getToken();
          return api(`blue-chat?action=presence&user_id=${encodeURIComponent(user_id)}&token=${encodeURIComponent(token)}`);
    },
    chatStatus: async (status) => {
          const token = await getToken();
          if (!token) return { ok: false };
          return api('blue-chat', { method: 'POST', body: JSON.stringify({ action: 'status', status, token }) });
    },
    // ── GRUPOS (chat em grupo estilo WhatsApp) ────────────────────────────
    meusGrupos: async () => {
          const token = await getToken();
          return api(`blue-grupos?action=listar&token=${encodeURIComponent(token)}`);
    },
    criarGrupo: async (nome, membros) => {
          const token = await getToken();
          return api('blue-grupos', { method: 'POST', body: JSON.stringify({ action: 'criar', token, nome, tipo: 'privado', membros: membros || [] }) });
    },
    grupoMensagens: async (grupo_id) => {
          const token = await getToken();
          return api(`blue-grupos?action=mensagens&grupo_id=${encodeURIComponent(grupo_id)}&token=${encodeURIComponent(token)}`);
    },
    grupoEnviar: async (grupo_id, mensagem, media) => {
          const token = await getToken();
          return api('blue-grupos', { method: 'POST', body: JSON.stringify({
                action: 'mensagem', token, grupo_id, mensagem: mensagem || '',
                ...(media?.url ? { media_url: media.url, media_type: media.type, media_duration: media.duration || null } : {}),
          }) });
    },
    grupoMembros: async (grupo_id) => {
          const token = await getToken();
          return api(`blue-grupos?action=membros&grupo_id=${encodeURIComponent(grupo_id)}&token=${encodeURIComponent(token)}`);
    },
    grupoAdicionar: async (grupo_id, user_id) => {
          const token = await getToken();
          return api('blue-grupos', { method: 'POST', body: JSON.stringify({ action: 'adicionar', token, grupo_id, user_id }) });
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
    // ── STORIES (viewer estilo Instagram) ─────────────────────────────────
    storyVer: async (story_id) => {
          const token = await getToken();
          return api(`blue-stories?action=ver&story_id=${encodeURIComponent(story_id)}&token=${encodeURIComponent(token)}`);
    },
    storyReagir: async (story_id, emoji) => {
          const token = await getToken();
          return api('blue-stories', { method: 'POST', body: JSON.stringify({ action: 'reagir', token, story_id, emoji }) });
    },
    storyReply: async (story_id, texto) => {
          const token = await getToken();
          return api('blue-stories', { method: 'POST', body: JSON.stringify({ action: 'reply', token, story_id, texto }) });
    },
    storyDeletar: async (story_id) => {
          const token = await getToken();
          return api('blue-stories', { method: 'POST', body: JSON.stringify({ action: 'deletar', token, story_id }) });
    },
    // Cria story: sobe a midia direto pro bucket blue-stories (mesmo fluxo
    // do site) e registra via action=criar. tipo: 'imagem' | 'video'.
    storyCriar: async (mediaUri, { tipo = 'imagem', duracao, mime } = {}) => {
          const token = await getToken();
          if (!token) return { error: 'Login necessario' };
          try {
                const ext = tipo === 'video' ? 'mp4' : 'jpg';
                const fname = Date.now() + '.' + ext;
                const pathStorage = 'stories/' + token.substring(0, 8) + '/' + fname;
                const url = `${SUPABASE_URL}/storage/v1/object/blue-stories/${pathStorage}`;
                const up = await FileSystem.uploadAsync(url, mediaUri, {
                      httpMethod: 'POST',
                      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
                      headers: {
                            apikey: SUPABASE_ANON_KEY,
                            Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
                            'Content-Type': mime || (tipo === 'video' ? 'video/mp4' : 'image/jpeg'),
                            'x-upsert': 'true',
                      },
                });
                if (up.status >= 400) return { error: 'Falha no upload do story (HTTP ' + up.status + ')' };
                const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/blue-stories/${pathStorage}`;
                return api('blue-stories', {
                      method: 'POST',
                      body: JSON.stringify({ action: 'criar', token, tipo, media_url: publicUrl, duracao: duracao || (tipo === 'video' ? 15 : 5) }),
                });
          } catch (e) {
                return { error: e.message || 'Falha ao criar story' };
          }
    },
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

          // Transcode pos-upload (fire-and-forget): o Railway re-encoda o video
          // com faststart + compressao — sem isso o feed baixa o arquivo inteiro
          // antes do 1o frame (tela preta). Mesmo hook do blue.html web.
          if (metaResp.video?.id) {
                api('blue-upload', {
                      method: 'POST',
                      body: JSON.stringify({ action: 'transcode', token, video_id: metaResp.video.id }),
                }).catch(() => {});
          }

          return { ok: true, video: metaResp.video };
    },

    // Edit perfil — action=update em blue-profile
    //   display_name: max 50 chars
    //   bio:          max 150 chars
    //   username:     lowercase a-z0-9_. (sluggified no backend), min 3 chars
    //   avatar_data:  data:image/jpeg;base64,... (max 2MB). Backend faz upload
    //                 pro Supabase Storage e devolve avatar_url.
    atualizarPerfil: async ({ display_name, bio, username, avatar_data, link_url, link_label } = {}) => {
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
                      ...(link_url !== undefined && { link_url }),
                      ...(link_label !== undefined && { link_label }),
                }),
          });
    },
};

export default blueAPI;
