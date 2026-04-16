import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Avatar from './Avatar';
import blueAPI from '../api';

export default function LivesBar() {
  const nav = useNavigation();
  const [lives, setLives] = useState([]);

  useEffect(() => {
    const load = () => blueAPI.livesAtivas().then((d) => setLives(d.lives || [])).catch(() => {});
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  if (!lives.length) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {lives.map((l) => {
          const host = l.host || {};
          return (
            <TouchableOpacity key={l.id} style={styles.item} onPress={() => nav.navigate('Live', { live_id: l.id })}>
              <View style={styles.ring}>
                <Avatar uri={host.avatar_url} initial={host.display_name || host.username} size={50} />
                <View style={styles.badge}><Text style={styles.badgeText}>LIVE</Text></View>
              </View>
              <Text style={styles.name} numberOfLines={1}>{host.display_name || host.username || '—'}</Text>
              <Text style={styles.viewers}>👁 {l.viewers_count || 0}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: 'rgba(239,68,68,.05)', borderBottomWidth: 1, borderBottomColor: 'rgba(239,68,68,.15)' },
  content: { padding: 8, gap: 12 },
  item: { alignItems: 'center', width: 72 },
  ring: { padding: 2, borderRadius: 30, borderWidth: 2, borderColor: '#ef4444', position: 'relative' },
  badge: { position: 'absolute', bottom: -4, left: '50%', marginLeft: -16, backgroundColor: '#ef4444', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  name: { color: '#fff', fontSize: 10, marginTop: 6, maxWidth: 64 },
  viewers: { color: 'rgba(239,68,68,.7)', fontSize: 9 },
});
