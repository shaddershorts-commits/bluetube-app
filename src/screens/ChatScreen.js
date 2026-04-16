import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import blueAPI from '../api';
import { COLORS } from '../constants';

export default function ChatScreen() {
  const nav = useNavigation();
  const [conversas, setConversas] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await blueAPI.conversas();
      setConversas(d.conversations || d.conversas || []);
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header title="Mensagens" />
      {loading ? (
        <ActivityIndicator color={COLORS.neon} style={{ marginTop: 40 }} />
      ) : !conversas.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>Nenhuma conversa ainda</Text>
          <Text style={styles.emptySub}>Envie uma mensagem para alguém pelo perfil</Text>
        </View>
      ) : (
        <FlatList
          data={conversas}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.neon} />}
          renderItem={({ item }) => {
            const o = item.other || item.outro || {};
            return (
              <TouchableOpacity style={styles.item} onPress={() => nav.navigate('Conversa', { conversation_id: item.id, other: o })}>
                <Avatar uri={o.avatar_url} initial={o.display_name || o.username} size={50} />
                <View style={styles.info}>
                  <Text style={styles.name}>{o.display_name || o.username || 'Usuário'}</Text>
                  <Text style={styles.last} numberOfLines={1}>{item.last_message || 'Sem mensagens'}</Text>
                </View>
                {item.unread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unread}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  emptySub: { color: COLORS.textSecondary, fontSize: 12 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  info: { flex: 1 },
  name: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  last: { color: COLORS.textSecondary, fontSize: 12 },
  badge: { backgroundColor: COLORS.neon, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
