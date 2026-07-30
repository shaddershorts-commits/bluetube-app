// CallScreen — chamada de voz/vídeo 1:1 (estilo WhatsApp), v1.5.2 / AAB 153.
//
// Como funciona (3 camadas):
//   1. REGISTRO  → api blue-calls (iniciar/atender/recusar/cancelar/encerrar)
//   2. AVISO     → canal Realtime `ring-<userId>` (app aberto) + push FCM
//                  (app fechado). Quem liga dispara os dois.
//   3. MÍDIA     → WebRTC direto entre os aparelhos. SDP/ICE trocados por
//                  canal Realtime `call-<callId>` (broadcast, nada persiste).
//
// params: { mode: 'outgoing'|'incoming', callId?, other, tipo }
//   outgoing → cria a chamada aqui (callId nasce da API)
//   incoming → callId veio do toque (Realtime ou push)
//
// Telas SEMPRE escuras (player-style) — importa COLORS_DARK.
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, StatusBar, Platform,
} from 'react-native';
import {
  RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices, RTCView,
} from 'react-native-webrtc';
import { useNavigation } from '@react-navigation/native';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import blueAPI from '../api';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { COLORS_DARK as COLORS } from '../constants';

let InCallManager = null;
try { InCallManager = require('react-native-incall-manager').default; } catch (e) {}

const RING_TIMEOUT_S = 45;

// STUN público do Google + TURN gratuito (Open Relay/Metered). O TURN só entra
// quando a conexão direta falha (NAT simétrico, ~10-20% dos casos). Se a taxa
// de conexão ficar ruim em produção, o upgrade é trocar ESTA lista por um
// TURN dedicado — nada mais muda.
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
};

function fmtDur(s) {
  const m = Math.floor(s / 60), r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export default function CallScreen({ route }) {
  const nav = useNavigation();
  const { mode, callId: callIdParam, other, tipo = 'audio' } = route.params || {};
  const isVideo = tipo === 'video';
  const myId = useAuthStore((s) => s.user?.id);
  useKeepAwake(); // tela não pode apagar no meio da chamada

  // fase: ringing (tocando) | connecting | active | ended
  const [fase, setFase] = useState('ringing');
  const [statusMsg, setStatusMsg] = useState(mode === 'outgoing' ? 'Chamando…' : 'Recebendo chamada…');
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(isVideo); // vídeo = viva-voz por padrão
  const [camOff, setCamOff] = useState(false);
  const [secs, setSecs] = useState(0);
  const [localStreamUrl, setLocalStreamUrl] = useState(null);
  const [remoteStreamUrl, setRemoteStreamUrl] = useState(null);

  const callIdRef = useRef(callIdParam || null);
  const pcRef = useRef(null);
  const localRef = useRef(null);
  const chanRef = useRef(null);
  const ringTimer = useRef(null);
  const secsTimer = useRef(null);
  const finishedRef = useRef(false);
  const pendingIce = useRef([]); // ICE que chegou antes do remoteDescription

  // ── encerramento único (idempotente) ────────────────────────────────────
  const finalizar = useCallback(async (motivo, chamarApi) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearTimeout(ringTimer.current);
    clearInterval(secsTimer.current);
    try { chanRef.current?.send({ type: 'broadcast', event: 'end', payload: { from: myId, motivo } }); } catch (e) {}
    try {
      if (chamarApi === 'cancelar') await blueAPI.callCancelar(callIdRef.current);
      else if (chamarApi === 'recusar') await blueAPI.callRecusar(callIdRef.current);
      else if (chamarApi === 'encerrar') await blueAPI.callEncerrar(callIdRef.current);
    } catch (e) {}
    try { localRef.current?.getTracks().forEach((t) => t.stop()); } catch (e) {}
    try { pcRef.current?.close(); } catch (e) {}
    try { if (chanRef.current) supabase.removeChannel(chanRef.current); } catch (e) {}
    try { InCallManager?.stopRingtone?.(); InCallManager?.stopRingback?.(); InCallManager?.stop?.(); } catch (e) {}
    setFase('ended');
    setStatusMsg(motivo);
    setTimeout(() => { try { nav.goBack(); } catch (e) {} }, 1200);
  }, [myId, nav]);

  // ── mídia local ─────────────────────────────────────────────────────────
  const abrirMidia = useCallback(async () => {
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: isVideo ? { facingMode: 'user', width: 640, height: 480 } : false,
    });
    localRef.current = stream;
    if (isVideo) setLocalStreamUrl(stream.toURL());
    return stream;
  }, [isVideo]);

  // ── monta o RTCPeerConnection e pluga o canal ───────────────────────────
  const montarPeer = useCallback((stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.addEventListener('track', (ev) => {
      const rs = ev.streams && ev.streams[0];
      if (rs) setRemoteStreamUrl(rs.toURL());
    });
    pc.addEventListener('icecandidate', (ev) => {
      if (ev.candidate) {
        chanRef.current?.send({ type: 'broadcast', event: 'ice', payload: { from: myId, candidate: ev.candidate.toJSON ? ev.candidate.toJSON() : ev.candidate } });
      }
    });
    pc.addEventListener('connectionstatechange', () => {
      const st = pc.connectionState;
      if (st === 'connected') {
        setFase('active');
        setStatusMsg('');
        if (!secsTimer.current) secsTimer.current = setInterval(() => setSecs((s) => s + 1), 1000);
        try { InCallManager?.stopRingback?.(); } catch (e) {}
      }
      if (st === 'failed') finalizar('Conexão perdida', 'encerrar');
      if (st === 'disconnected') setStatusMsg('Reconectando…');
    });
    return pc;
  }, [myId, finalizar]);

  const aplicarIcePendentes = async () => {
    const pc = pcRef.current;
    for (const c of pendingIce.current.splice(0)) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
    }
  };

  // ── canal de sinalização call-<id> ──────────────────────────────────────
  const entrarNoCanal = useCallback((souCaller) => {
    const ch = supabase.channel(`call-${callIdRef.current}`, {
      config: { broadcast: { self: false } },
    });
    chanRef.current = ch;

    ch.on('broadcast', { event: 'accept' }, async () => {
      // callee atendeu → caller cria e manda a oferta
      if (!souCaller) return;
      try {
        setFase('connecting'); setStatusMsg('Conectando…');
        try { InCallManager?.stopRingback?.(); } catch (e) {}
        const pc = pcRef.current;
        const offer = await pc.createOffer({});
        await pc.setLocalDescription(offer);
        ch.send({ type: 'broadcast', event: 'offer', payload: { from: myId, sdp: pc.localDescription } });
      } catch (e) { finalizar('Erro ao conectar', 'encerrar'); }
    });

    ch.on('broadcast', { event: 'offer' }, async ({ payload }) => {
      if (souCaller || payload?.from === myId) return;
      try {
        const pc = pcRef.current;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await aplicarIcePendentes();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ch.send({ type: 'broadcast', event: 'answer', payload: { from: myId, sdp: pc.localDescription } });
      } catch (e) { finalizar('Erro ao conectar', 'encerrar'); }
    });

    ch.on('broadcast', { event: 'answer' }, async ({ payload }) => {
      if (!souCaller || payload?.from === myId) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await aplicarIcePendentes();
      } catch (e) { finalizar('Erro ao conectar', 'encerrar'); }
    });

    ch.on('broadcast', { event: 'ice' }, async ({ payload }) => {
      if (payload?.from === myId || !payload?.candidate) return;
      const pc = pcRef.current;
      if (!pc) return;
      if (pc.remoteDescription) {
        try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch (e) {}
      } else {
        pendingIce.current.push(payload.candidate); // guarda até a oferta chegar
      }
    });

    ch.on('broadcast', { event: 'decline' }, () => {
      if (souCaller) finalizar('Chamada recusada', null);
    });
    ch.on('broadcast', { event: 'end' }, ({ payload }) => {
      if (payload?.from !== myId) finalizar('Chamada encerrada', 'encerrar');
    });
    ch.on('broadcast', { event: 'cancel' }, () => {
      if (!souCaller) finalizar(`${other?.display_name || 'A pessoa'} desligou`, null);
    });

    ch.subscribe();
    return ch;
  }, [myId, other, finalizar]);

  // ── fluxo de QUEM LIGA ──────────────────────────────────────────────────
  const iniciarComoCaller = useCallback(async () => {
    try {
      const r = await blueAPI.callIniciar(other.user_id, tipo);
      if (r?.error || !r?.call_id) {
        Alert.alert('Não deu pra ligar', r?.error || 'Tenta de novo em instantes.');
        nav.goBack();
        return;
      }
      callIdRef.current = r.call_id;
      const stream = await abrirMidia();
      montarPeer(stream);
      entrarNoCanal(true);
      // toca no aparelho do outro se o app dele estiver ABERTO (push cobre fechado)
      const ringCh = supabase.channel(`ring-${other.user_id}`);
      ringCh.subscribe((st) => {
        if (st === 'SUBSCRIBED') {
          ringCh.send({
            type: 'broadcast', event: 'ring',
            payload: { call_id: r.call_id, tipo, caller: r.caller || { user_id: myId } },
          });
          setTimeout(() => { try { supabase.removeChannel(ringCh); } catch (e) {} }, 4000);
        }
      });
      try { InCallManager?.start?.({ media: isVideo ? 'video' : 'audio' }); InCallManager?.startRingback?.('_DEFAULT_'); } catch (e) {}
      ringTimer.current = setTimeout(() => finalizar('Não atendeu', 'cancelar'), RING_TIMEOUT_S * 1000);
    } catch (e) {
      Alert.alert('Não deu pra ligar', e.message?.includes('permission') || e.message?.includes('Permission')
        ? 'Libera câmera e microfone nas permissões do app.' : (e.message || 'Erro inesperado'));
      nav.goBack();
    }
  }, [other, tipo, isVideo, myId, abrirMidia, montarPeer, entrarNoCanal, finalizar, nav]);

  // ── fluxo de QUEM RECEBE ────────────────────────────────────────────────
  const prepararComoCallee = useCallback(async () => {
    try {
      // a chamada ainda existe? (posso ter chegado atrasado pelo push)
      const est = await blueAPI.callEstado(callIdRef.current);
      if (est?.call?.status && est.call.status !== 'ringing') {
        finalizar(est.call.status === 'missed' ? 'Chamada perdida' : 'Chamada já encerrada', null);
        return;
      }
      entrarNoCanal(false);
      try { InCallManager?.startRingtone?.('_DEFAULT_'); } catch (e) {}
      ringTimer.current = setTimeout(() => finalizar('Chamada perdida', null), RING_TIMEOUT_S * 1000);
    } catch (e) { finalizar('Erro na chamada', null); }
  }, [entrarNoCanal, finalizar]);

  const atender = async () => {
    try {
      clearTimeout(ringTimer.current);
      try { InCallManager?.stopRingtone?.(); InCallManager?.start?.({ media: isVideo ? 'video' : 'audio' }); } catch (e) {}
      setFase('connecting'); setStatusMsg('Conectando…');
      const stream = await abrirMidia();
      montarPeer(stream);
      const r = await blueAPI.callAtender(callIdRef.current);
      if (r?.error) { finalizar(r.error, null); return; }
      chanRef.current?.send({ type: 'broadcast', event: 'accept', payload: { from: myId } });
    } catch (e) {
      finalizar(e.message?.toLowerCase().includes('permission') ? 'Sem permissão de câmera/microfone' : 'Erro ao atender', 'recusar');
    }
  };

  const recusar = () => {
    chanRef.current?.send({ type: 'broadcast', event: 'decline', payload: { from: myId } });
    finalizar('Chamada recusada', 'recusar');
  };

  const desligar = () => {
    if (mode === 'outgoing' && fase === 'ringing') {
      chanRef.current?.send({ type: 'broadcast', event: 'cancel', payload: { from: myId } });
      finalizar('Chamada cancelada', 'cancelar');
    } else {
      finalizar('Chamada encerrada', 'encerrar');
    }
  };

  // ── controles em chamada ────────────────────────────────────────────────
  const toggleMute = () => {
    const on = !muted;
    setMuted(on);
    try { localRef.current?.getAudioTracks().forEach((t) => { t.enabled = !on; }); } catch (e) {}
  };
  const toggleSpeaker = () => {
    const on = !speakerOn;
    setSpeakerOn(on);
    try { InCallManager?.setForceSpeakerphoneOn?.(on); } catch (e) {}
  };
  const toggleCam = () => {
    const off = !camOff;
    setCamOff(off);
    try { localRef.current?.getVideoTracks().forEach((t) => { t.enabled = !off; }); } catch (e) {}
  };
  const flipCam = () => {
    try { localRef.current?.getVideoTracks().forEach((t) => t._switchCamera && t._switchCamera()); } catch (e) {}
  };

  useEffect(() => {
    if (mode === 'outgoing') iniciarComoCaller();
    else prepararComoCallee();
    return () => { finalizar('Chamada encerrada', fase === 'active' ? 'encerrar' : null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nome = other?.display_name || (other?.username ? '@' + other.username : 'Chamada');
  const emChamada = fase === 'active';
  const recebendo = mode === 'incoming' && fase === 'ringing';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* vídeo remoto em tela cheia + meu preview no canto */}
      {isVideo && remoteStreamUrl ? (
        <RTCView streamURL={remoteStreamUrl} style={StyleSheet.absoluteFill} objectFit="cover" />
      ) : null}
      {isVideo && localStreamUrl && !camOff ? (
        <View style={styles.pip}>
          <RTCView streamURL={localStreamUrl} style={{ flex: 1 }} objectFit="cover" mirror zOrder={1} />
        </View>
      ) : null}

      {/* identidade + status (voz sempre; vídeo enquanto não conecta) */}
      {(!isVideo || !remoteStreamUrl) && (
        <View style={styles.centro}>
          <Avatar uri={other?.avatar_url} initial={nome} size={110} />
          <Text style={styles.nome}>{nome}</Text>
          <Text style={styles.status}>
            {emChamada ? fmtDur(secs) : statusMsg}
          </Text>
          <Text style={styles.tipoLabel}>{isVideo ? '📹 Chamada de vídeo' : '📞 Chamada de voz'}</Text>
        </View>
      )}
      {isVideo && remoteStreamUrl && (
        <View style={styles.topoVideo} pointerEvents="none">
          <Text style={styles.nomeVideo}>{nome}</Text>
          <Text style={styles.statusVideo}>{emChamada ? fmtDur(secs) : statusMsg}</Text>
        </View>
      )}

      {/* controles */}
      <View style={styles.controles}>
        {recebendo ? (
          <View style={styles.linhaAtender}>
            <TouchableOpacity style={[styles.btnGrande, { backgroundColor: '#ef4444' }]} onPress={recusar}>
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnGrande, { backgroundColor: '#22c55e' }]} onPress={atender}>
              <Ionicons name={isVideo ? 'videocam' : 'call'} size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.linhaControles}>
              <TouchableOpacity style={[styles.btnCtrl, muted && styles.btnCtrlAtivo]} onPress={toggleMute}>
                <Ionicons name={muted ? 'mic-off' : 'mic'} size={22} color="#fff" />
                <Text style={styles.ctrlLabel}>{muted ? 'Mudo' : 'Mudo'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnCtrl, speakerOn && styles.btnCtrlAtivo]} onPress={toggleSpeaker}>
                <Ionicons name={speakerOn ? 'volume-high' : 'volume-medium'} size={22} color="#fff" />
                <Text style={styles.ctrlLabel}>Viva-voz</Text>
              </TouchableOpacity>
              {isVideo ? (
                <>
                  <TouchableOpacity style={[styles.btnCtrl, camOff && styles.btnCtrlAtivo]} onPress={toggleCam}>
                    <Ionicons name={camOff ? 'videocam-off' : 'videocam'} size={22} color="#fff" />
                    <Text style={styles.ctrlLabel}>Câmera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnCtrl} onPress={flipCam}>
                    <Ionicons name="camera-reverse" size={22} color="#fff" />
                    <Text style={styles.ctrlLabel}>Virar</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
            <TouchableOpacity style={[styles.btnGrande, { backgroundColor: '#ef4444', alignSelf: 'center' }]} onPress={desligar}>
              <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050b16' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 30 },
  nome: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 14, textAlign: 'center' },
  status: { color: 'rgba(232,244,255,0.7)', fontSize: 15, minHeight: 20 },
  tipoLabel: { color: 'rgba(232,244,255,0.45)', fontSize: 12.5, marginTop: 4 },
  topoVideo: { position: 'absolute', top: 54, left: 0, right: 0, alignItems: 'center', gap: 2 },
  nomeVideo: { color: '#fff', fontSize: 17, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 8 },
  statusVideo: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 8 },
  pip: {
    position: 'absolute', top: 60, right: 16, width: 108, height: 158,
    borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: '#000', elevation: 8, zIndex: 5,
  },
  controles: { position: 'absolute', bottom: 44, left: 0, right: 0, gap: 22, paddingHorizontal: 26 },
  linhaControles: { flexDirection: 'row', justifyContent: 'center', gap: 18 },
  btnCtrl: {
    width: 66, alignItems: 'center', gap: 5, paddingVertical: 10,
    borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)',
  },
  btnCtrlAtivo: { backgroundColor: 'rgba(0,170,255,0.45)' },
  ctrlLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '600' },
  linhaAtender: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' },
  btnGrande: {
    width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 10,
  },
});
