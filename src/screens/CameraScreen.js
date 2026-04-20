import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as MediaLibrary from 'expo-media-library';
import { COLORS } from '../constants';

export default function CameraScreen() {
  const nav = useNavigation();
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const [facing, setFacing] = useState('front');
  const [recording, setRecording] = useState(false);
  const [mode, setMode] = useState(60);
  const [videoUri, setVideoUri] = useState(null);
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!camPerm?.granted) requestCam();
    if (!micPerm?.granted) requestMic();
  }, []);

  const startRecording = async () => {
    if (!cameraRef.current) return;
    setRecording(true);
    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: mode });
      setVideoUri(video.uri);
    } catch (e) { Alert.alert('Erro', e.message); }
    setRecording(false);
  };

  const stopRecording = () => {
    cameraRef.current?.stopRecording();
  };

  const saveAndPublish = async () => {
    if (!videoUri) return;
    setSaving(true);
    // Salvar na galeria é opcional — publicação é o fluxo principal
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (perm.granted) MediaLibrary.saveToLibraryAsync(videoUri).catch(() => {});
    } catch (e) {}
    setSaving(false);
    const uri = videoUri;
    setVideoUri(null);
    nav.navigate('PostVideo', { videoUri: uri, duration: mode });
  };

  if (!camPerm) return <View style={styles.center}><ActivityIndicator color="#fff" /></View>;

  if (!camPerm.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Precisamos de acesso à câmera</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestCam}>
          <Text style={styles.permBtnText}>Permitir</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (videoUri) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.previewHeader}>
          <TouchableOpacity onPress={() => setVideoUri(null)}>
            <Ionicons name="close" color="#fff" size={28} />
          </TouchableOpacity>
          <Text style={styles.previewTitle}>Preview</Text>
          <View style={{ width: 28 }} />
        </SafeAreaView>
        <View style={styles.previewBody}>
          <Text style={styles.previewIcon}>✅</Text>
          <Text style={styles.previewText}>Vídeo gravado com sucesso!</Text>
          <TouchableOpacity style={styles.publishBtn} onPress={saveAndPublish} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.publishBtnText}>Continuar →</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setVideoUri(null)}>
            <Text style={styles.discard}>Gravar novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode="video"
      />

      <SafeAreaView style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.iconBtn}>
          <Ionicons name="close" color="#fff" size={28} />
        </TouchableOpacity>
        <View style={styles.modeRow}>
          {[15, 30, 60].map((m) => (
            <TouchableOpacity key={m} onPress={() => setMode(m)} style={styles.modeTab}>
              <Text style={[styles.modeText, mode === m && styles.modeActive]}>{m}s</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))} style={styles.iconBtn}>
          <Ionicons name="camera-reverse" color="#fff" size={28} />
        </TouchableOpacity>
      </SafeAreaView>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={recording ? stopRecording : startRecording}
          style={[styles.recBtn, recording && styles.recBtnActive]}>
          <View style={[styles.recInner, recording && styles.recInnerActive]} />
        </TouchableOpacity>
        {recording && <Text style={styles.recText}>Gravando…</Text>}
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
  modeRow: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(0,0,0,.3)', borderRadius: 20, padding: 4 },
  modeTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  modeText: { color: 'rgba(255,255,255,.6)', fontSize: 12, fontWeight: '700' },
  modeActive: { color: '#fff' },
  controls: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center', gap: 10 },
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
});
