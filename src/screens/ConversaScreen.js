// Conversa estilo WhatsApp — 1:1 e grupo:
//   texto + emoji (picker embutido) + foto/vídeo/GIF da galeria + áudio gravado
//   presença no header (online / visto por último) — 1:1
//   ticks: ✓ enviado · ✓✓ entregue · ✓✓ azul lido — 1:1
//   grupo: nome do autor em cada bolha
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert, Keyboard, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Avatar from '../components/Avatar';
import EmojiPicker from '../components/EmojiPicker';
import blueAPI from '../api';
import { useAuthStore } from '../store';
import { openModeration } from '../utils/moderation';
import GlassMenu from '../components/GlassMenu';
import ShareCard from '../components/ShareCard';
import { COLORS } from '../constants';
import { useChatTheme } from '../store/theme';

function fmtDur(s) {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return m + ':' + String(r).padStart(2, '0');
}

function fmtLastSeen(iso) {
  if (!iso) return 'offline';
  const d = new Date(iso);
  const hoje = new Date();
  const hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  if (d.toDateString() === hoje.toDateString()) return 'visto por último hoje às ' + hm;
  const ontem = new Date(hoje.getTime() - 86400000);
  if (d.toDateString() === ontem.toDateString()) return 'visto por último ontem às ' + hm;
  return 'visto por último em ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
}

// Ticks estilo WhatsApp (só nas minhas mensagens, 1:1)
function Ticks({ msg }) {
  if (msg.read) return <Text style={[styles.tick, { color: '#53bdeb' }]}>✓✓</Text>;
  if (msg.delivered) return <Text style={styles.tick}>✓✓</Text>;
  return <Text style={styles.tick}>✓</Text>;
}

// Bolha de áudio com play/pause (expo-av)
function AudioBubble({ msg, mine }) {
  const [sound, setSound] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  useEffect(() => () => { sound?.unloadAsync?.(); }, [sound]);
  const toggle = async () => {
    try {
      if (!sound) {
        const { sound: s } = await Audio.Sound.createAsync({ uri: msg.media_url }, { shouldPlay: true });
        s.setOnPlaybackStatusUpdate((st) => {
          if (!st.isLoaded) return;
          setPos(Math.floor((st.positionMillis || 0) / 1000));
          setPlaying(st.isPlaying);
          if (st.didJustFinish) { setPlaying(false); setPos(0); }
        });
        setSound(s);
        setPlaying(true);
      } else if (playing) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (_) {}
  };
  return (
    <TouchableOpacity style={styles.audioRow} onPress={toggle}>
      <Ionicons name={playing ? 'pause-circle' : 'play-circle'} size={34} color={mine ? '#fff' : COLORS.neon} />
      <View style={styles.audioBar}>
        <View style={[styles.audioFill, { width: msg.media_duration ? Math.min(100, (pos / msg.media_duration) * 100) + '%' : '0%', backgroundColor: mine ? '#fff' : COLORS.neon }]} />
      </View>
      <Text style={[styles.audioDur, mine && { color: 'rgba(255,255,255,0.8)' }]}>
        {fmtDur(playing ? pos : msg.media_duration)}
      </Text>
    </TouchableOpacity>
  );
}

export default function ConversaScreen({ route }) {
  // 1:1: { conversation_id, other } ou { initNewChat, other }
  // grupo: { grupo }
  const { conversation_id: paramConvId, other, initNewChat, grupo, is_request } = route.params || {};
  const isGrupo = !!grupo;
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  // Tema do BlueChat (Configurações → Temas): overrides por cima dos styles fixos
  const T = useChatTheme();
  const ov = {
    container: { backgroundColor: T.background },
    header: { backgroundColor: T.surface, borderBottomColor: T.border },
    mine: { backgroundColor: T.bubbleMe },
    other: { backgroundColor: T.bubbleOther },
    msgOther: { color: T.bubbleOtherText, fontFamily: T.font },
    msgMine: { color: T.bubbleText, fontFamily: T.font },
    inputBar: { backgroundColor: T.background, borderTopColor: T.border },
    input: { backgroundColor: T.input, color: T.text, fontFamily: T.font },
    sendBtn: { backgroundColor: T.accent },
  };
  const [convId, setConvId] = useState(paramConvId || null);
  const [resolving, setResolving] = useState(initNewChat && !paramConvId);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [gravSecs, setGravSecs] = useState(0);
  const [presence, setPresence] = useState(null);
  const [membrosCount, setMembrosCount] = useState(null);
  const [msgMenu, setMsgMenu] = useState(null);       // mensagem alvo do long-press
  const [editing, setEditing] = useState(null);       // mensagem em edição
  const [requestPend, setRequestPend] = useState(!!is_request); // banner Novos contatos
  const [meuRole, setMeuRole] = useState('membro');   // meu papel no grupo
  const recordingRef = useRef(null);
  const gravTimerRef = useRef(null);
  const listRef = useRef(null);
  const myId = useAuthStore((s) => s.user?.id);

  // Resolve conv_id (1:1 vindo do perfil)
  useEffect(() => {
    let cancelled = false;
    if (isGrupo || convId || !initNewChat || !other?.user_id) return;
    (async () => {
      try {
        const r = await blueAPI.abrirConversa(other.user_id);
        if (!cancelled && r?.conv_id) setConvId(r.conv_id);
      } catch (e) { console.error('[Conversa] open-conv:', e?.message); }
      finally { if (!cancelled) setResolving(false); }
    })();
    return () => { cancelled = true; };
  }, [convId, initNewChat, other?.user_id]);

  const load = useCallback(async () => {
    try {
      if (isGrupo) {
        const d = await blueAPI.grupoMensagens(grupo.id);
        setMensagens(d?.mensagens || []);
      } else {
        if (!convId) return;
        const d = await blueAPI.mensagens(convId);
        setMensagens(d?.messages || []);
      }
    } catch (e) { console.error('[Conversa] load:', e?.message); }
  }, [convId, isGrupo, grupo?.id]);

  useEffect(() => {
    if (!isGrupo && !convId) return;
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load, convId, isGrupo]);

  // Presença do outro (1:1) — poll 30s
  useEffect(() => {
    if (isGrupo || !other?.user_id) return;
    let cancelled = false;
    const poll = async () => {
      const p = await blueAPI.presenca(other.user_id).catch(() => null);
      if (!cancelled && p) setPresence(p);
    };
    poll();
    const t = setInterval(poll, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, [isGrupo, other?.user_id]);

  // Membros do grupo (subtítulo)
  useEffect(() => {
    if (!isGrupo) return;
    blueAPI.grupoMembros(grupo.id).then((d) => {
      const ms = d?.membros || [];
      setMembrosCount(ms.length);
      const eu = ms.find((m) => m.user_id === myId);
      if (eu?.role) setMeuRole(eu.role);
    }).catch(() => {});
  }, [isGrupo, grupo?.id]);

  const enviarConteudo = async (msgTexto, media) => {
    setEnviando(true);
    try {
      let r;
      if (isGrupo) r = await blueAPI.grupoEnviar(grupo.id, msgTexto, media);
      else r = await blueAPI.enviarMensagem(convId, msgTexto, other.user_id, media);
      if (r?.error) { Alert.alert('Não enviou', r.error); return false; }
      if (!isGrupo && r?.conv_id && r.conv_id !== convId) setConvId(r.conv_id);
      load();
      return true;
    } catch (e) {
      Alert.alert('Não enviou', e.message || 'Erro de conexão');
      return false;
    } finally { setEnviando(false); }
  };

  const enviar = async () => {
    const t = texto.trim();
    if (!t || enviando) return;
    if (editing) {
      setEnviando(true);
      const r = isGrupo ? await blueAPI.gmsgEdit(editing.id, t).catch((e) => ({ error: e.message }))
                        : await blueAPI.msgEdit(editing.id, t).catch((e) => ({ error: e.message }));
      setEnviando(false);
      if (r?.error) { Alert.alert('Não deu pra editar', r.error); return; }
      setEditing(null); setTexto('');
      load();
      return;
    }
    setTexto('');
    const ok = await enviarConteudo(t, null);
    if (!ok) setTexto(t);
  };

  // Long-press na mensagem → opções (apagar pra mim / apagar envio / editar)
  const msgMenuOptions = () => {
    const m = msgMenu;
    if (!m) return [];
    const senderId = isGrupo ? m.user_id : m.sender_id;
    const minha = senderId === myId;
    const dentro3h = Date.now() - new Date(m.created_at).getTime() <= 3 * 3600 * 1000;
    const apagar = async (scope) => {
      const r = isGrupo ? await blueAPI.gmsgDelete(m.id, scope).catch((e) => ({ error: e.message }))
                        : await blueAPI.msgDelete(m.id, scope).catch((e) => ({ error: e.message }));
      if (r?.error) Alert.alert('Não deu pra apagar', r.error); else load();
    };
    const opts = [{ icon: 'trash-outline', label: 'Apagar pra mim', onPress: () => apagar('me') }];
    if (minha && dentro3h && !m.deleted_for_all) {
      opts.push({ icon: 'trash-bin-outline', label: 'Apagar envio', danger: true, onPress: () => apagar('all') });
      const body = m.text || m.mensagem || '';
      if (body && (m.edited_count || 0) < 3) {
        opts.push({ icon: 'pencil-outline', label: 'Editar' + (m.edited_count ? ` (${3 - m.edited_count} restantes)` : ''), onPress: () => { setEditing(m); setTexto(body); } });
      }
    }
    if (!minha && isGrupo && meuRole === 'admin' && !m.deleted_for_all) {
      opts.push({ icon: 'shield-outline', label: 'Apagar pra todos (admin)', danger: true, onPress: () => apagar('all') });
    }
    return opts;
  };

  // Aceitar "novo contato" → conversa vai pra lista principal
  const aceitarContato = async () => {
    if (!other?.user_id) return;
    await blueAPI.contatoAdd(other.user_id).catch(() => {});
    setRequestPend(false);
  };

  // Foto/vídeo/GIF da galeria
  const anexar = async () => {
    try {
      // Photo Picker do sistema — sem permissão de galeria
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.8, videoMaxDuration: 60 });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      const isVideo = a.type === 'video';
      const isGif = /\.gif$/i.test(a.fileName || a.uri || '');
      const ext = isVideo ? 'mp4' : isGif ? 'gif' : 'jpg';
      const mime = isVideo ? 'video/mp4' : isGif ? 'image/gif' : 'image/jpeg';
      setEnviando(true);
      const up = await blueAPI.uploadChatMedia(a.uri, { ext, mime });
      if (up?.error) { setEnviando(false); Alert.alert('Falha no upload', up.error); return; }
      await enviarConteudo('', {
        url: up.url,
        type: isVideo ? 'video' : isGif ? 'gif' : 'image',
        duration: isVideo ? Math.round((a.duration || 0) / 1000) || null : null,
      });
    } catch (e) { setEnviando(false); Alert.alert('Erro', e.message); }
  };

  // Áudio: toca-e-segura estilo WhatsApp simplificado (toque inicia, toque para e envia)
  const toggleGravar = async () => {
    if (gravando) {
      // parar e enviar
      clearInterval(gravTimerRef.current);
      setGravando(false);
      try {
        const rec = recordingRef.current;
        recordingRef.current = null;
        await rec.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        const uri = rec.getURI();
        const dur = gravSecs;
        if (!uri || dur < 1) return; // gravação curta demais
        setEnviando(true);
        const up = await blueAPI.uploadChatMedia(uri, { ext: 'm4a', mime: 'audio/m4a' });
        if (up?.error) { setEnviando(false); Alert.alert('Falha no upload', up.error); return; }
        await enviarConteudo('', { url: up.url, type: 'audio', duration: dur });
      } catch (e) { setEnviando(false); }
      return;
    }
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permissão', 'Libera o microfone pra gravar áudio.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setGravSecs(0);
      setGravando(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      gravTimerRef.current = setInterval(() => setGravSecs((s) => s + 1), 1000);
    } catch (e) { Alert.alert('Erro', 'Não deu pra iniciar a gravação.'); }
  };

  useEffect(() => () => { clearInterval(gravTimerRef.current); recordingRef.current?.stopAndUnloadAsync?.().catch(() => {}); }, []);

  const headerTitle = isGrupo ? grupo.nome : (other?.display_name || other?.username || 'Conversa');
  const headerSub = isGrupo
    ? (membrosCount != null ? membrosCount + ' membros' : ' ')
    : presence
      ? (presence.status === 'hidden'
          ? ' ' // privacidade: novos contatos não veem online/visto por último
          : presence.status === 'online' && presence.status_updated_at && (Date.now() - new Date(presence.status_updated_at).getTime()) < 150000
            ? 'online'
            : fmtLastSeen(presence.status_updated_at))
      : ' ';

  if (resolving) {
    return (
      <View style={[styles.container, ov.container]}>
        <View style={[styles.header, ov.header, { paddingTop: insets.top + 6 }]}>
          <TouchableOpacity onPress={() => nav.goBack()}><Ionicons name="chevron-back" size={26} color={COLORS.text} /></TouchableOpacity>
          <Text style={styles.headerName}>{headerTitle}</Text>
        </View>
        <View style={styles.loadingCenter}><ActivityIndicator color={COLORS.neon} /></View>
      </View>
    );
  }

  const renderMsg = ({ item }) => {
    const senderId = isGrupo ? item.user_id : item.sender_id;
    const mine = senderId === myId;
    const body = item.text || item.mensagem || '';
    const media = item.media_url ? { url: item.media_url, type: item.media_type, duration: item.media_duration } : null;
    if (item.deleted_for_all) {
      return (
        <View style={[styles.bubble, mine ? [styles.mine, ov.mine] : [styles.other, ov.other]]}>
          <Text style={styles.msgApagada}>🚫 Mensagem apagada</Text>
        </View>
      );
    }
    return (
      <Pressable onLongPress={() => setMsgMenu(item)} delayLongPress={320}>
      <View style={[styles.bubble, mine ? [styles.mine, ov.mine] : [styles.other, ov.other], media && styles.bubbleMedia]}>
        {isGrupo && !mine && (
          <Text style={styles.autorNome}>@{item.autor?.username || 'membro'}</Text>
        )}
        {media?.type === 'image' || media?.type === 'gif' ? (
          <Image source={{ uri: media.url }} style={styles.imgMsg} resizeMode="cover" />
        ) : media?.type === 'video' ? (
          <Video source={{ uri: media.url }} style={styles.imgMsg} resizeMode={ResizeMode.COVER} useNativeControls />
        ) : media?.type === 'audio' ? (
          <AudioBubble msg={item} mine={mine} />
        ) : media?.type === 'share' ? (
          <ShareCard videoId={media.url} />
        ) : null}
        {body ? <Text style={[styles.msg, mine ? ov.msgMine : ov.msgOther]}>{body}</Text> : null}
        <View style={styles.tickRow}>
          {item.edited_at ? <Text style={styles.editada}>editada</Text> : null}
          {mine && !isGrupo ? <Ticks msg={item} /> : null}
        </View>
      </View>
      </Pressable>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.container, ov.container]}>
      {/* Header estilo WhatsApp: avatar + nome + presença */}
      <View style={[styles.header, ov.header, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={COLORS.text} />
        </TouchableOpacity>
        {isGrupo
          ? <View style={styles.groupAv}><Ionicons name="people" size={20} color={COLORS.neon} /></View>
          : <Avatar uri={other?.avatar_url} initial={other?.display_name || other?.username} size={38} />}
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => isGrupo
            ? nav.navigate('GrupoInfo', { grupo })
            : (other?.user_id && nav.navigate('PerfilUsuario', { user_id: other.user_id }))}>
          <Text style={styles.headerName} numberOfLines={1}>{headerTitle}</Text>
          <Text style={[styles.headerSub, headerSub === 'online' && { color: '#4ade80' }]} numberOfLines={1}>{headerSub}</Text>
        </TouchableOpacity>
        {!isGrupo && other?.user_id ? (
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => openModeration(nav, { tipoAlvo: 'usuario', alvoId: other.user_id, userId: other.user_id, username: other.username, onBlocked: () => nav.goBack() })}>
            <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        data={mensagens}
        keyExtractor={(item, i) => String(item.id || i)}
        renderItem={renderMsg}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        keyboardShouldPersistTaps="handled"
      />

      {gravando ? (
        <View style={styles.gravBar}>
          <Ionicons name="mic" size={20} color="#ef4444" />
          <Text style={styles.gravText}>Gravando… {fmtDur(gravSecs)}</Text>
          <Text style={styles.gravHint}>toque no botão pra enviar</Text>
        </View>
      ) : null}

      {/* Novo contato: quem te chamou ainda não está na sua lista */}
      {requestPend && !isGrupo ? (
        <View style={styles.reqBanner}>
          <Text style={styles.reqBannerText}>@{other?.username || 'usuário'} não está nos seus contatos</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.reqAddBtn} onPress={aceitarContato}>
              <Text style={styles.reqAddText}>➕ Adicionar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reqBlockBtn} onPress={() => openModeration(nav, { tipoAlvo: 'usuario', alvoId: other?.user_id, userId: other?.user_id, username: other?.username, onBlocked: () => nav.goBack() })}>
              <Text style={styles.reqBlockText}>Bloquear</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Barra de edição ativa */}
      {editing ? (
        <View style={styles.editBar}>
          <Ionicons name="pencil" size={14} color={COLORS.neon} />
          <Text style={styles.editBarText} numberOfLines={1}>Editando mensagem</Text>
          <TouchableOpacity onPress={() => { setEditing(null); setTexto(''); }} hitSlop={10}>
            <Ionicons name="close" size={16} color={COLORS.textDim} />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.inputBar, ov.inputBar]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => { Keyboard.dismiss(); setShowEmoji((s) => !s); }}>
          <Ionicons name={showEmoji ? 'keypad-outline' : 'happy-outline'} size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, ov.input]}
          placeholder="Mensagem…"
          placeholderTextColor={COLORS.textDim}
          value={texto}
          onChangeText={setTexto}
          multiline
          editable={!enviando && !gravando}
          onFocus={() => setShowEmoji(false)}
        />
        <TouchableOpacity style={styles.iconBtn} onPress={anexar} disabled={enviando || gravando}>
          <Ionicons name="image-outline" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
        {texto.trim() ? (
          <TouchableOpacity style={[styles.sendBtn, ov.sendBtn]} onPress={enviar} disabled={enviando}>
            {enviando ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" color="#fff" size={18} />}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.sendBtn, ov.sendBtn, gravando && { backgroundColor: '#ef4444' }]} onPress={toggleGravar} disabled={enviando}>
            {enviando ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name={gravando ? 'stop' : 'mic'} color="#fff" size={18} />}
          </TouchableOpacity>
        )}
      </View>

      {showEmoji ? (
        <EmojiPicker
          mode="chat"
          onPick={(e) => setTexto((t) => t + e)}
          onGif={(url) => { setShowEmoji(false); enviarConteudo('', { url, type: 'gif' }); }}
        />
      ) : null}

      {/* Menu liquid glass do long-press na mensagem */}
      <GlassMenu
        visible={!!msgMenu}
        title="Mensagem"
        options={msgMenuOptions()}
        onClose={() => setMsgMenu(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  msgApagada: { color: COLORS.textDim, fontSize: 13, fontStyle: 'italic' },
  editada: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontStyle: 'italic', marginRight: 4 },
  reqBanner: { marginHorizontal: 12, marginBottom: 6, padding: 12, borderRadius: 14, backgroundColor: 'rgba(0,170,255,0.07)', borderWidth: 1, borderColor: 'rgba(0,170,255,0.2)', gap: 8 },
  reqBannerText: { color: COLORS.textSecondary, fontSize: 12.5, textAlign: 'center' },
  reqAddBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  reqAddText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  reqBlockBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(248,113,113,0.4)', borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  reqBlockText: { color: '#f87171', fontSize: 13, fontWeight: '700' },
  editBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginBottom: 4, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(0,170,255,0.08)' },
  editBarText: { color: COLORS.textSecondary, fontSize: 12, flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  headerName: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  headerSub: { color: COLORS.textSecondary, fontSize: 11, marginTop: 1 },
  groupAv: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,170,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '78%', padding: 10, borderRadius: 14, marginVertical: 3 },
  bubbleMedia: { padding: 4 },
  mine: { alignSelf: 'flex-end', backgroundColor: COLORS.primary },
  other: { alignSelf: 'flex-start', backgroundColor: COLORS.surface },
  msg: { color: COLORS.text, fontSize: 14, paddingHorizontal: 4, paddingTop: 2 },
  autorNome: { color: COLORS.neon, fontSize: 11, fontWeight: '700', marginBottom: 2, paddingHorizontal: 4 },
  imgMsg: { width: 220, height: 220, borderRadius: 10, backgroundColor: '#000' },
  tickRow: { alignSelf: 'flex-end', marginTop: 2, paddingHorizontal: 4 },
  tick: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '700', letterSpacing: -2 },
  audioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 180, padding: 4 },
  audioBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  audioFill: { height: '100%' },
  audioDur: { color: COLORS.textSecondary, fontSize: 11 },
  gravBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(239,68,68,0.08)' },
  gravText: { color: '#ef4444', fontSize: 13, fontWeight: '700' },
  gravHint: { color: COLORS.textDim, fontSize: 11, marginLeft: 'auto' },
  inputBar: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background, alignItems: 'flex-end', gap: 4 },
  input: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.text, maxHeight: 100 },
  iconBtn: { padding: 8 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.neon, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
