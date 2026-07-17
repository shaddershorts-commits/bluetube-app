// Barra de stories no topo do feed. FIX 2026-07-14: o backend responde
// { users: [{user_id, username, avatar_url, stories:[...]}], meu } — o parse
// antigo lia d.stories (inexistente) e a barra nunca aparecia. Agora tambem
// alimenta feedStore.storyUsers (anel azul nos avatares do feed) e abre o
// StoryViewer ao tocar.
import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import Avatar from './Avatar';
import blueAPI from '../api';
import { useFeedStore } from '../store';
import { COLORS_DARK as COLORS } from '../constants';

export default function StoriesBar() {
  const nav = useNavigation();
  const isFocused = useIsFocused();
  const setStoryUsers = useFeedStore((s) => s.setStoryUsers);
  const [groups, setGroups] = useState([]);

  const load = useCallback(() => {
    blueAPI.storiesFeed().then((d) => {
      const gs = (d && d.users) || [];
      // So mostra quem tem story ativo
      const ativos = gs.filter((g) => Array.isArray(g.stories) && g.stories.length > 0);
      setGroups(ativos);
      setStoryUsers(new Set(ativos.map((g) => g.user_id)));
    }).catch(() => {});
  }, [setStoryUsers]);

  useEffect(() => { if (isFocused) load(); }, [isFocused, load]);

  if (!groups.length) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {groups.map((g, i) => {
          const todosVistos = g.stories.every((s) => s.visto);
          return (
            <TouchableOpacity
              key={g.user_id || i}
              style={styles.item}
              activeOpacity={0.8}
              onPress={() => nav.navigate('StoryViewer', { users: groups, startUserIndex: i })}>
              <View style={[styles.ring, !todosVistos && styles.ringActive]}>
                <Avatar uri={g.avatar_url} initial={g.display_name || g.username} size={54} />
              </View>
              <Text style={styles.name} numberOfLines={1}>{g.username || '—'}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: 'transparent' },
  content: { padding: 8, gap: 10 },
  item: { alignItems: 'center', width: 72 },
  ring: { padding: 2, borderRadius: 32, borderWidth: 2, borderColor: 'rgba(255,255,255,.15)' },
  ringActive: { borderColor: COLORS.neon },
  name: { color: '#fff', fontSize: 10, marginTop: 4, maxWidth: 64 },
});
