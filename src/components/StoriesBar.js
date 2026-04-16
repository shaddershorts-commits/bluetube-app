import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Avatar from './Avatar';
import blueAPI from '../api';
import { COLORS } from '../constants';

export default function StoriesBar() {
  const [stories, setStories] = useState([]);

  useEffect(() => {
    blueAPI.storiesFeed().then((d) => setStories(d.stories || [])).catch(() => {});
  }, []);

  if (!stories.length) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {stories.map((s, i) => (
          <TouchableOpacity key={i} style={styles.item}>
            <View style={[styles.ring, !s.visto && styles.ringActive]}>
              <Avatar uri={s.avatar_url} initial={s.username} size={54} />
            </View>
            <Text style={styles.name} numberOfLines={1}>{s.username || '—'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 48, left: 0, right: 0, zIndex: 50, backgroundColor: 'rgba(2,8,23,0.8)' },
  content: { padding: 8, gap: 10 },
  item: { alignItems: 'center', width: 72 },
  ring: { padding: 2, borderRadius: 30, borderWidth: 2, borderColor: 'rgba(255,255,255,.15)' },
  ringActive: { borderColor: COLORS.neon },
  name: { color: '#fff', fontSize: 10, marginTop: 4, maxWidth: 64 },
});
