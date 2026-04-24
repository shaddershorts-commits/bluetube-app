import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity,
  RefreshControl, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import blueAPI from '../api';
import { COLORS } from '../constants';

const TIPO_ICON = {
  like: 'heart',
  follow: 'person-add',
  comment: 'chatbubble',
  save: 'bookmark',
  share: 'share-social',
  mention: 'at',
  default: 'notifications',
};

const TIPO_COR = {
  like: '#ef4444',
  follow: '#10b981',
  comment: '#3b82f6',
  save: '#f59e0b',
  share: '#8b5cf6',
  mention: COLORS.neon,
  default: COLORS.textDim,
};

function ago(ts) {
  if (!ts) return '';
  const d = new Date(ts).getTime();
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return Math.floor(diff / 60) + 'min';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd';
  return new Date(ts).toLocaleDateString('pt-BR');
}

export default function NotificationsScreen() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await blueAPI.notificacoes();
      setNotifs((d && d.notifications) || []);
      // Marca todas como lidas (best-effort)
      blueAPI.marcarNotificacoesLidas().catch(() => {});
    } catch (e) {
      console.error('[NotificationsScreen] erro:', e?.message || e);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <Header title="Notificações" showBack />
        <View style={styles.center}><ActivityIndicator color={COLORS.neon} /></View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header title="Notificações" showBack />
      {notifs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>Sem notificações ainda</Text>
          <Text style={styles.emptyHint}>Quando alguém curtir, comentar ou seguir, aparece aqui</Text>
        </View>
      ) : (
        <FlatList
          data={notifs}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neon} />}
          renderItem={({ item }) => {
            const tipo = item.tipo || 'default';
            const icon = TIPO_ICON[tipo] || TIPO_ICON.default;
            const cor = TIPO_COR[tipo] || TIPO_COR.default;
            const onPress = () => {
              // Heuristica: se tem video_id no payload, abre video. Se tem from_user_id, abre perfil.
              if (item.video_id) Linking.openURL(`https://bluetubeviral.com/blue-video?v=${item.video_id}`).catch(() => {});
              else if (item.from_username) Linking.openURL(`https://bluetubeviral.com/blue?u=${item.from_username}`).catch(() => {});
            };
            return (
              <TouchableOpacity onPress={onPress} style={[styles.row, !item.read && styles.rowUnread]} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: cor + '22' }]}>
                  <Ionicons name={icon} size={20} color={cor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={2}>{item.titulo || 'Notificação'}</Text>
                  {item.mensagem ? <Text style={styles.msg} numberOfLines={2}>{item.mensagem}</Text> : null}
                  <Text style={styles.time}>{ago(item.created_at)}</Text>
                </View>
                {!item.read && <View style={styles.dot} />}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingVertical: 8 }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  rowUnread: { backgroundColor: 'rgba(0,170,255,0.04)' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  msg: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  time: { color: COLORS.textDim, fontSize: 11, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.neon },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 68 },
  empty: { alignItems: 'center', paddingVertical: 100, gap: 8, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  emptyHint: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
