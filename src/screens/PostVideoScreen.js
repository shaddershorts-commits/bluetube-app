import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import blueAPI from '../api';
import { COLORS } from '../constants';

const MAX_TITLE = 100;
const MAX_DESC = 500;

export default function PostVideoScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const { videoUri, duration } = route.params || {};
  const videoRef = useRef(null);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState(0);

  const onPublish = async () => {
    const t = titulo.trim();
    if (!t) {
      Alert.alert('Título obrigatório', 'Coloca um título pro teu vídeo antes de publicar.');
      return;
    }
    setPublishing(true);
    setProgress(0);
    try {
      const result = await blueAPI.publicarVideo(videoUri, {
        titulo: t,
        descricao: descricao.trim(),
        duration: duration || 30,
        onProgress: (p) => setProgress(p),
      });
      if (result?.error) throw new Error(result.error);
      Alert.alert(
        'Publicado!',
        'Teu vídeo tá no ar. Às vezes demora alguns segundos pra aparecer no feed.',
        [{ text: 'OK', onPress: () => nav.reset({ index: 0, routes: [{ name: 'Main' }] }) }]
      );
    } catch (e) {
      Alert.alert('Erro ao publicar', e.message || 'Tenta de novo em alguns segundos.');
    }
    setPublishing(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity onPress={() => !publishing && nav.goBack()} disabled={publishing}>
          <Ionicons name="close" color="#fff" size={26} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Novo vídeo</Text>
        <TouchableOpacity onPress={onPublish} disabled={publishing || !titulo.trim()}>
          <Text
            style={[
              styles.publishBtn,
              (publishing || !titulo.trim()) && styles.publishBtnDisabled,
            ]}>
            {publishing ? 'Enviando…' : 'Publicar'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.previewWrap}>
          {videoUri ? (
            <Video
              ref={videoRef}
              source={{ uri: videoUri }}
              style={styles.preview}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping
              isMuted={false}
              useNativeControls={false}
            />
          ) : (
            <View style={[styles.preview, styles.previewFallback]}>
              <Ionicons name="videocam-off" color={COLORS.textDim} size={32} />
            </View>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Título</Text>
          <TextInput
            style={styles.input}
            value={titulo}
            onChangeText={(v) => setTitulo(v.slice(0, MAX_TITLE))}
            placeholder="O que acontece nesse vídeo?"
            placeholderTextColor={COLORS.textDim}
            maxLength={MAX_TITLE}
            editable={!publishing}
          />
          <Text style={styles.counter}>{titulo.length}/{MAX_TITLE}</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={descricao}
            onChangeText={(v) => setDescricao(v.slice(0, MAX_DESC))}
            placeholder="Conta mais sobre o vídeo, usa #hashtags pra categorizar"
            placeholderTextColor={COLORS.textDim}
            maxLength={MAX_DESC}
            multiline
            numberOfLines={4}
            editable={!publishing}
          />
          <Text style={styles.counter}>{descricao.length}/{MAX_DESC}</Text>
        </View>

        {publishing ? (
          <View style={styles.progressWrap}>
            <ActivityIndicator color={COLORS.neon} />
            <Text style={styles.progressLabel}>
              {progress > 0 && progress < 1 ? `Enviando ${Math.round(progress * 100)}%…` : 'Processando…'}
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.max(4, progress * 100)}%` }]} />
            </View>
            <Text style={styles.progressHint}>Não fecha o app.</Text>
          </View>
        ) : (
          <Text style={styles.hint}>
            Ao publicar, teu vídeo passa por moderação automática. Se o conteúdo for OK, aparece no feed em segundos.
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  publishBtn: {
    color: COLORS.neon,
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 8,
  },
  publishBtnDisabled: { color: COLORS.textDim },
  body: { padding: 18, paddingBottom: 32, gap: 18 },
  previewWrap: {
    width: '100%',
    aspectRatio: 9 / 16,
    maxHeight: 380,
    alignSelf: 'center',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  preview: { width: '100%', height: '100%' },
  previewFallback: { alignItems: 'center', justifyContent: 'center' },
  fieldGroup: { gap: 6 },
  label: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputMulti: { minHeight: 96, textAlignVertical: 'top' },
  counter: {
    color: COLORS.textDim,
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  progressWrap: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 22,
    backgroundColor: 'rgba(0,170,255,0.04)',
    borderRadius: 14,
    paddingHorizontal: 20,
  },
  progressLabel: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.neon },
  progressHint: { color: COLORS.textDim, fontSize: 11 },
  hint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
});
