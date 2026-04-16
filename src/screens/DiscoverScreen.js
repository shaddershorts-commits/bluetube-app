import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import Header from '../components/Header';
import blueAPI from '../api';
import { COLORS } from '../constants';

export default function DiscoverScreen() {
  const [hashtags, setHashtags] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await blueAPI.trending();
      setHashtags(d.hashtags || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header title="🔥 Em alta" />
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.neon} />}>
        {hashtags.length === 0 ? (
          <Text style={styles.empty}>Nenhuma hashtag em alta ainda.</Text>
        ) : (
          hashtags.map((t, i) => (
            <TouchableOpacity key={t.id || i} style={styles.item}>
              <Text style={styles.rank}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.tag}>#{t.nome}{t.trending ? ' 🔥' : ''}</Text>
                <Text style={styles.usos}>{t.usos} vídeos</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: COLORS.textSecondary, padding: 40, textAlign: 'center', fontSize: 13 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rank: { color: COLORS.textDim, fontSize: 16, fontWeight: '800', width: 24 },
  tag: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  usos: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
});
