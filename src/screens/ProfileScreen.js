import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import blueAPI from '../api';
import { useAuthStore } from '../store';
import { COLORS } from '../constants';

export default function ProfileScreen() {
  const nav = useNavigation();
  const { logout } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await blueAPI.meuPerfil();
      setProfile(d.profile || d);
      const s = await blueAPI.monetizacaoStatus();
      setStats(s);
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleLogout = () => {
    Alert.alert('Sair', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.neon} /></View>;

  return (
    <ScrollView style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.neon} />}>
      <View style={styles.header}>
        <Avatar uri={profile?.avatar_url} initial={profile?.display_name || profile?.username} size={90} />
        <Text style={styles.name}>{profile?.display_name || profile?.username || '—'}</Text>
        <Text style={styles.username}>@{profile?.username || 'blue'}</Text>
        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile?.seguidores || 0}</Text>
            <Text style={styles.statLabel}>Seguidores</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile?.seguindo || 0}</Text>
            <Text style={styles.statLabel}>Seguindo</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile?.videos_count || 0}</Text>
            <Text style={styles.statLabel}>Vídeos</Text>
          </View>
        </View>
      </View>

      <View style={styles.menu}>
        <MenuItem icon="analytics-outline" label="Analytics" onPress={() => Alert.alert('Em breve', 'Analytics disponível na web')} />
        <MenuItem icon="cash-outline" label={stats?.tem_conta ? `Monetização — R$${(stats.saldo_disponivel || 0).toFixed(2)}` : 'Monetização'} onPress={() => Alert.alert('Em breve', 'Monetização completa disponível na web')} />
        <MenuItem icon="bookmark-outline" label="Salvos" />
        <MenuItem icon="notifications-outline" label="Notificações" />
        <MenuItem icon="settings-outline" label="Configurações" />
        {/* TEMP: remover após confirmar Sentry. Dispara crash proposital. */}
        <MenuItem icon="bug-outline" label="Testar Sentry (crash)" onPress={() => { throw new Error('Teste Sentry BlueTube'); }} color={COLORS.gold} />
        <MenuItem icon="log-out-outline" label="Sair" onPress={handleLogout} color={COLORS.red} />
      </View>
    </ScrollView>
  );
}

function MenuItem({ icon, label, onPress, color }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={22} color={color || COLORS.text} />
      <Text style={[styles.menuLabel, color && { color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textDim} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  header: { alignItems: 'center', padding: 24, paddingTop: 60 },
  name: { color: COLORS.text, fontSize: 20, fontWeight: '800', marginTop: 12 },
  username: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  bio: { color: COLORS.text, fontSize: 13, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
  statsRow: { flexDirection: 'row', gap: 30, marginTop: 20 },
  stat: { alignItems: 'center' },
  statValue: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  statLabel: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  menu: { padding: 14 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuLabel: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '500' },
});
