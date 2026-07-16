// ShareSheet — compartilhar vídeo DENTRO do Blue (estilo TikTok/WhatsApp):
// primeiro as pessoas/grupos com quem você mais conversa; depois o share
// externo padrão do sistema (WhatsApp, Instagram etc).
import { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable, Share, ActivityIndicator, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import blueAPI from '../api';
import { COLORS } from '../constants';

export default function ShareSheet({ visible, video, onClose }) {
  const [chats, setChats] = useState(null);
  const [sentTo, setSentTo] = useState({}); // id -> true (feedback "enviado ✓")

  useEffect(() => {
    if (!visible) { setSentTo({}); return; }
    setChats(null);
    blueAPI.topChats().then((d) => setChats(d?.chats || [])).catch(() => setChats([]));
  }, [visible]);

  const enviarPara = async (chat) => {
    if (sentTo[chat.type + chat.id]) return;
    setSentTo((s) => ({ ...s, [chat.type + chat.id]: 'sending' }));
    try {
      const media = { url: String(video.id), type: 'share' };
      if (chat.type === 'grupo') await blueAPI.grupoEnviar(chat.id, '', media);
      else await blueAPI.enviarMensagem(null, '', chat.id, media);
      setSentTo((s) => ({ ...s, [chat.type + chat.id]: true }));
    } catch (e) {
      setSentTo((s) => { const n = { ...s }; delete n[chat.type + chat.id]; return n; });
    }
  };

  const shareExterno = async () => {
    onClose();
    try {
      await Share.share({ message: `${video.title || 'Vídeo no Blue'} — https://bluetubeviral.com/blue-video.html?v=${video.id}` });
    } catch {}
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheetWrap} onPress={(e) => e.stopPropagation()}>
          <BlurView intensity={50} tint="dark" style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>Compartilhar</Text>

            {/* Dentro do Blue: quem você mais conversa */}
            {chats === null ? (
              <ActivityIndicator color={COLORS.neon} style={{ marginVertical: 24 }} />
            ) : chats.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chatsRow} keyboardShouldPersistTaps="handled">
                {chats.map((c) => {
                  const st = sentTo[c.type + c.id];
                  return (
                    <TouchableOpacity key={c.type + c.id} style={styles.chatItem} onPress={() => enviarPara(c)} disabled={st === true}>
                      <View>
                        {c.type === 'grupo'
                          ? <View style={styles.groupAv}><Ionicons name="people" size={22} color={COLORS.neon} /></View>
                          : <Avatar uri={c.avatar} initial={c.nome} size={54} />}
                        {st === true ? <View style={styles.sentBadge}><Ionicons name="checkmark" size={13} color="#fff" /></View> : null}
                        {st === 'sending' ? <View style={styles.sentBadge}><ActivityIndicator size={10} color="#fff" /></View> : null}
                      </View>
                      <Text style={styles.chatNome} numberOfLines={1}>{c.nome}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.empty}>Converse com alguém no chat pra compartilhar por aqui 💬</Text>
            )}

            {/* Fora do Blue: share padrão do sistema */}
            <TouchableOpacity style={styles.externo} onPress={shareExterno}>
              <Ionicons name="share-social-outline" size={20} color={COLORS.neon} />
              <Text style={styles.externoText}>Compartilhar fora do Blue (WhatsApp, Instagram…)</Text>
            </TouchableOpacity>
          </BlurView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(2,8,23,0.55)', justifyContent: 'flex-end' },
  sheetWrap: { padding: 12 },
  sheet: { borderRadius: 24, overflow: 'hidden', paddingBottom: 14, borderWidth: 1, borderColor: 'rgba(0,170,255,0.25)', backgroundColor: 'rgba(10,22,40,0.55)' },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'center', marginTop: 10 },
  title: { color: '#fff', fontSize: 15, fontWeight: '800', textAlign: 'center', marginTop: 10, marginBottom: 6 },
  chatsRow: { paddingHorizontal: 14, paddingVertical: 10, gap: 14 },
  chatItem: { alignItems: 'center', width: 66 },
  chatNome: { color: COLORS.textSecondary, fontSize: 10.5, marginTop: 5, textAlign: 'center' },
  groupAv: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(0,170,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  sentBadge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0a1830' },
  empty: { color: COLORS.textDim, fontSize: 12, textAlign: 'center', paddingVertical: 18, paddingHorizontal: 24 },
  externo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 14, marginTop: 6, padding: 14, borderRadius: 14, backgroundColor: 'rgba(0,170,255,0.07)', borderWidth: 1, borderColor: 'rgba(0,170,255,0.18)' },
  externoText: { color: COLORS.text, fontSize: 13, fontWeight: '600', flex: 1 },
});
