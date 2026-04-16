import { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import blueAPI from '../api';
import { COLORS } from '../constants';

export default function ComentariosScreen({ route }) {
  const { video_id } = route.params;
  const [comentarios, setComentarios] = useState([]);
  const [texto, setTexto] = useState('');

  const load = async () => {
    try {
      const d = await blueAPI.comentarios(video_id);
      setComentarios(d.comments || d.comentarios || []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const enviar = async () => {
    if (!texto.trim()) return;
    await blueAPI.comentar(video_id, texto.trim());
    setTexto('');
    load();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header title="Comentários" showBack />
      <FlatList
        data={comentarios}
        keyExtractor={(item, i) => String(item.id || i)}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Avatar uri={item.avatar_url} initial={item.username} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={styles.user}>@{item.username || 'blue'}</Text>
              <Text style={styles.text}>{item.content || item.texto}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum comentário ainda. Seja o primeiro!</Text>}
      />
      <View style={styles.inputBar}>
        <TextInput style={styles.input} placeholder="Adicionar comentário…" placeholderTextColor={COLORS.textDim}
          value={texto} onChangeText={setTexto} />
        <TouchableOpacity style={styles.send} onPress={enviar}>
          <Ionicons name="send" color={COLORS.neon} size={22} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  user: { color: COLORS.neon, fontSize: 12, fontWeight: '700', marginBottom: 2 },
  text: { color: COLORS.text, fontSize: 13 },
  empty: { color: COLORS.textSecondary, textAlign: 'center', padding: 40, fontSize: 13 },
  inputBar: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: COLORS.border, alignItems: 'center' },
  input: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.text },
  send: { padding: 10 },
});
