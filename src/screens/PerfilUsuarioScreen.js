import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import blueAPI from '../api';
import { COLORS } from '../constants';

export default function PerfilUsuarioScreen({ route }) {
  const { user_id } = route.params;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    blueAPI.perfil(user_id).then((d) => { setProfile(d.profile || d); setLoading(false); }).catch(() => setLoading(false));
  }, [user_id]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.neon} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header title={profile?.display_name || profile?.username || '—'} showBack />
      <ScrollView>
        <View style={styles.hero}>
          <Avatar uri={profile?.avatar_url} initial={profile?.display_name || profile?.username} size={84} />
          <Text style={styles.name}>{profile?.display_name || profile?.username}</Text>
          <Text style={styles.username}>@{profile?.username}</Text>
          {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          <TouchableOpacity style={styles.followBtn}>
            <Text style={styles.followText}>+ Seguir</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  hero: { alignItems: 'center', padding: 24 },
  name: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginTop: 12 },
  username: { color: COLORS.textSecondary, marginTop: 2 },
  bio: { color: COLORS.text, fontSize: 13, textAlign: 'center', marginTop: 8 },
  followBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 16 },
  followText: { color: '#fff', fontWeight: '700' },
});
