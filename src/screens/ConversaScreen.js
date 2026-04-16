import { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import blueAPI from '../api';
import { COLORS } from '../constants';

export default function ConversaScreen({ route }) {
  const { conversation_id, other } = route.params;
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const listRef = useRef(null);

  const load = async () => {
    try {
      const d = await blueAPI.mensagens(conversation_id);
      setMensagens(d.messages || d.mensagens || []);
    } catch {}
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const enviar = async () => {
    if (!texto.trim()) return;
    const msg = texto.trim();
    setTexto('');
    await blueAPI.enviarMensagem(conversation_id, msg, other?.user_id);
    load();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <Header title={other?.display_name || other?.username || 'Conversa'} showBack />
      <FlatList
        ref={listRef}
        data={mensagens}
        keyExtractor={(item, i) => String(item.id || i)}
        renderItem={({ item }) => {
          const mine = item.sender_id !== other?.user_id;
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.other]}>
              <Text style={[styles.msg, mine && { color: '#fff' }]}>{item.content || item.mensagem}</Text>
            </View>
          );
        }}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />
      <View style={styles.inputBar}>
        <TextInput style={styles.input} placeholder="Mensagem…" placeholderTextColor={COLORS.textDim}
          value={texto} onChangeText={setTexto} multiline />
        <TouchableOpacity style={styles.send} onPress={enviar}>
          <Ionicons name="send" color={COLORS.neon} size={22} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  bubble: { maxWidth: '78%', padding: 10, borderRadius: 14, marginVertical: 3 },
  mine: { alignSelf: 'flex-end', backgroundColor: COLORS.primary },
  other: { alignSelf: 'flex-start', backgroundColor: COLORS.surface },
  msg: { color: COLORS.text, fontSize: 14 },
  inputBar: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.text, maxHeight: 100 },
  send: { padding: 10 },
});
