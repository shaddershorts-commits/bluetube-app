// Aba ＋ (user 2026-07-24): abre um CHOOSER — Vídeo ou Storie.
// - Vídeo  → galeria direto (até 10 min, sem limite de tamanho) → PostVideo
// - Storie → CÂMERA (até 3 min) com opção de galeria abaixo → publica no
//   Status do BlueChat (mesmo canal do FAB da aba Status)
// Pills de segundos (15/30/60) REMOVIDAS por pedido do user.
import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { COLORS_DARK as COLORS } from '../constants';
import blueAPI from '../api';

const VIDEO_MAX_S = 600;   // vídeo postado: até 10 minutos
const STORIE_MAX_S = 180;  // storie/status: até 3 minutos

export default function CameraScreen() {
  const nav = useNavigation();
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const [facing, setFacing] = useState('front');
  const [recording, setRecording] = useState(false);
  const [escolha, setEscolha] = useState(null); // null = chooser | 'storie'
  const [videoUri, setVideoUri] = useState(null);
  const [publicando, setPublicando] = useState(false);
  // ferramentas pré-gravação estilo Instagram (user 2026-07-24)
  const [flashOn, setFlashOn] = useState(false);
  const [timerSec, setTimerSec] = useState(0);        // 0 | 3 | 10
  const [countdown, setCountdown] = useState(null);   // contagem na tela
  const [previewMuted, setPreviewMuted] = useState(false);
  const cameraRef = useRef(null);

  // sempre que a aba ganha foco, volta pro chooser (fluxo limpo a cada entrada)
  useFocusEffect(useCallback(() => {
    setEscolha(null);
    setVideoUri(null);
    return () => { try { cameraRef.current?.stopRecording(); } catch (e) {} };
  }, []));

  // ── VÍDEO: galeria direto → PostVideo (até 10 min, sem limite de tamanho) ──
  const escolherVideo = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 1,
        videoMaxDuration: VIDEO_MAX_S,
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const durSec = Math.round((asset.duration || 30000) / 1000);
      if (durSec > VIDEO_MAX_S) {
        Alert.alert('Vídeo muito longo', 'O vídeo pode ter até 10 minutos.');
        return;
      }
      nav.navigate('PostVideo', { videoUri: asset.uri, duration: Math.max(1, durSec) });
    } catch (e) { Alert.alert('Erro', e.message || 'Não deu pra abrir a galeria.'); }
  };

  // ── STORIE: publica no Status do BlueChat ──
  const publicarStorie = async (uri, tipo, mime) => {
    setPublicando(true);
    const r = await blueAPI.storyCriar(uri, {
      tipo, mime, audience: 'status',
    }).catch((e) => ({ error: e.message }));
    setPublicando(false);
    if (r?.error) { Alert.alert('Não deu pra postar', r.error); return; }
    setVideoUri(null);
    setEscolha(null);
    Alert.alert('✨ Storie publicado!', 'Seus contatos podem ver por 24 horas.');
    nav.navigate('Chat');
  };

  const storieDaGaleria = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.9,
        videoMaxDuration: STORIE_MAX_S,
      });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      const isVideo = a.type === 'video' || /video/.test(a.mimeType || '');
      if (isVideo && Math.round((a.duration || 0) / 1000) > STORIE_MAX_S) {
        Alert.alert('Storie muito longo', 'O storie pode ter até 3 minutos.');
        return;
      }
      await publicarStorie(a.uri, isVideo ? 'video' : 'imagem', a.mimeType);
    } catch (e) { Alert.alert('Erro', e.message || 'Não deu pra abrir a galeria.'); }
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;
    // temporizador (mãos livres, estilo Instagram): 3s/10s de contagem na tela
    if (timerSec > 0) {
      for (let s = timerSec; s > 0; s--) {
        setCountdown(s);
        await new Promise((r) => setTimeout(r, 1000));
      }
      setCountdown(null);
    }
    setRecording(true);
    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: STORIE_MAX_S });
      setVideoUri(video.uri);
      setPreviewMuted(false);
    } catch (e) { Alert.alert('Erro', e.message); }
    setRecording(false);
  };
  const stopRecording = () => { cameraRef.current?.stopRecording(); };

  const descartarPreview = () => {
    // Instagram pergunta antes de jogar fora
    Alert.alert('Descartar storie?', 'O vídeo gravado vai ser perdido.', [
      { text: 'Continuar editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => setVideoUri(null) },
    ]);
  };

  // ── CHOOSER (primeira tela da aba ＋) ──
  if (escolha === null) {
    return (
      <View style={styles.chooserWrap}>
        <SafeAreaView style={styles.chooserHeader}>
          <TouchableOpacity onPress={() => nav.navigate('Feed')} style={styles.iconBtn}>
            <Ionicons name="close" color="#fff" size={26} />
          </TouchableOpacity>
        </SafeAreaView>
        <View style={styles.chooserBody}>
          <Text style={styles.chooserTitle}>O que você quer criar?</Text>
          <TouchableOpacity style={styles.chooserCard} activeOpacity={0.8} onPress={escolherVideo}>
            <Text style={styles.chooserIcon}>🎬</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.chooserCardTitle}>Vídeo</Text>
              <Text style={styles.chooserCardSub}>Publica no feed pra todo mundo · até 10 min</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.chooserCard} activeOpacity={0.8} onPress={() => setEscolha('storie')}>
            <Text style={styles.chooserIcon}>✨</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.chooserCardTitle}>Storie</Text>
              <Text style={styles.chooserCardSub}>Some em 24h, só seus contatos veem · até 3 min</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── STORIE: câmera ──
  if (!camPerm) return <View style={styles.center}><ActivityIndicator color="#fff" /></View>;
  if (!camPerm.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Precisamos de acesso à câmera</Text>
        <TouchableOpacity style={styles.permBtn} onPress={async () => { await requestCam(); if (!micPerm?.granted) requestMic(); }}>
          <Text style={styles.permBtnText}>Permitir</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={storieDaGaleria}>
          <Text style={styles.discard}>Ou escolher da galeria</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── PREVIEW estilo Instagram: o storie TOCA em loop pra REVER antes de
  // postar (user 2026-07-24). X descarta (com confirmação), 🔊 muta,
  // "Seu storie" (pílula, base-esquerda) e ➤ (base-direita) publicam.
  if (videoUri) {
    return (
      <View style={styles.container}>
        <Video
          source={{ uri: videoUri }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted={previewMuted}
        />
        <SafeAreaView style={styles.header}>
          <TouchableOpacity onPress={descartarPreview} style={styles.iconBtn}>
            <Ionicons name="close" color="#fff" size={28} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => setPreviewMuted((m) => !m)} style={styles.iconBtn}>
            <Ionicons name={previewMuted ? 'volume-mute' : 'volume-high'} color="#fff" size={24} />
          </TouchableOpacity>
        </SafeAreaView>
        <View style={styles.previewFooter}>
          <TouchableOpacity
            style={styles.seuStorieBtn}
            onPress={() => publicarStorie(videoUri, 'video', 'video/mp4')}
            disabled={publicando}>
            {publicando ? <ActivityIndicator color="#0a1526" size="small" /> : (
              <>
                <View style={styles.seuStorieAvatar}><Text style={{ fontSize: 14 }}>✨</Text></View>
                <Text style={styles.seuStorieText}>Seu storie</Text>
              </>
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={styles.sendFab}
            onPress={() => publicarStorie(videoUri, 'video', 'video/mp4')}
            disabled={publicando}>
            {publicando ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="arrow-forward" color="#fff" size={24} />}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── CÂMERA estilo Instagram: X no topo-esquerdo, rail de ferramentas à
  // esquerda (flash + temporizador), galeria embaixo-esquerda, captura no
  // centro, virar câmera embaixo-direita.
  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} mode="video" enableTorch={flashOn && facing === 'back'} />

      <SafeAreaView style={styles.header}>
        <TouchableOpacity onPress={() => setEscolha(null)} style={styles.iconBtn}>
          <Ionicons name="close" color="#fff" size={28} />
        </TouchableOpacity>
        <View style={styles.storieBadge}>
          <Text style={styles.storieBadgeText}>✨ Storie · até 3 min</Text>
        </View>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      {/* rail de ferramentas (esquerda, estilo Instagram) */}
      {!recording && (
        <View style={styles.toolRail}>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setFlashOn((f) => !f)}>
            <Ionicons name={flashOn ? 'flash' : 'flash-off'} color={flashOn ? '#ffd32a' : '#fff'} size={22} />
            <Text style={styles.toolLabel}>Flash</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setTimerSec((s) => (s === 0 ? 3 : s === 3 ? 10 : 0))}>
            <Ionicons name="timer-outline" color={timerSec ? '#ffd32a' : '#fff'} size={22} />
            <Text style={styles.toolLabel}>{timerSec ? `${timerSec}s` : 'Timer'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* contagem regressiva do temporizador */}
      {countdown != null && (
        <View style={styles.countdownWrap} pointerEvents="none">
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      )}

      <View style={styles.controls}>
        <View style={styles.controlsRow}>
          <TouchableOpacity onPress={storieDaGaleria} style={styles.galleryBtn} disabled={recording || publicando}>
            <Ionicons name="images-outline" color="#fff" size={24} />
            <Text style={styles.galleryText}>Galeria</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={recording ? stopRecording : startRecording}
            style={[styles.recBtn, recording && styles.recBtnActive]}>
            <View style={[styles.recInner, recording && styles.recInnerActive]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))} style={styles.galleryBtn} disabled={recording}>
            <Ionicons name="camera-reverse" color="#fff" size={26} />
            <Text style={styles.galleryText}>Virar</Text>
          </TouchableOpacity>
        </View>
        {recording && <Text style={styles.recText}>Gravando…</Text>}
        {publicando && <Text style={styles.recText}>Publicando…</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 14 },
  permText: { color: '#fff', fontSize: 15 },
  permBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  permBtnText: { color: '#fff', fontWeight: '700' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,.3)', alignItems: 'center', justifyContent: 'center' },
  storieBadge: { backgroundColor: 'rgba(0,0,0,.35)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7 },
  storieBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  controls: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center', gap: 10 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 },
  galleryBtn: { width: 52, alignItems: 'center', gap: 3 },
  galleryText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  recBtn: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: 'rgba(255,255,255,.3)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.1)' },
  recBtnActive: { borderColor: 'rgba(239,68,68,.5)' },
  recInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  recInnerActive: { width: 30, height: 30, borderRadius: 6, backgroundColor: '#ef4444' },
  recText: { color: '#ef4444', fontSize: 13, fontWeight: '700' },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: 'rgba(2,8,23,.9)' },
  previewTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  previewBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 16 },
  previewIcon: { fontSize: 64 },
  previewText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  publishBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 14, marginTop: 12 },
  publishBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  discard: { color: COLORS.textSecondary, fontSize: 13, marginTop: 8 },
  // preview estilo Instagram
  previewFooter: {
    position: 'absolute', bottom: 34, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  seuStorieBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 100, paddingVertical: 10, paddingHorizontal: 16,
    minWidth: 130, justifyContent: 'center',
  },
  seuStorieAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,170,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  seuStorieText: { color: '#0a1526', fontWeight: '800', fontSize: 14 },
  sendFab: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  // rail de ferramentas
  toolRail: { position: 'absolute', left: 12, top: 110, gap: 16, alignItems: 'center' },
  toolBtn: { alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,.3)', borderRadius: 12, padding: 9, minWidth: 52 },
  toolLabel: { color: '#fff', fontSize: 9.5, fontWeight: '700' },
  countdownWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  countdownText: { color: '#fff', fontSize: 110, fontWeight: '900', textShadowColor: 'rgba(0,0,0,.6)', textShadowRadius: 16 },
  // chooser
  chooserWrap: { flex: 1, backgroundColor: '#05101f' },
  chooserHeader: { paddingHorizontal: 12, paddingTop: 8 },
  chooserBody: { flex: 1, justifyContent: 'center', paddingHorizontal: 22, gap: 14, paddingBottom: 80 },
  chooserTitle: { color: '#e8f4ff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 14 },
  chooserCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(0,170,255,0.08)', borderWidth: 1, borderColor: 'rgba(0,170,255,0.28)',
    borderRadius: 18, paddingHorizontal: 18, paddingVertical: 20,
  },
  chooserIcon: { fontSize: 34 },
  chooserCardTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  chooserCardSub: { color: 'rgba(200,225,255,0.6)', fontSize: 12.5, marginTop: 3 },
});
