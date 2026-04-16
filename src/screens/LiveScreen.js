import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Header from '../components/Header';
import { COLORS } from '../constants';

export default function LiveScreen({ route }) {
  const { live_id } = route.params || {};
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Header title="Ao vivo" showBack />
      <View style={styles.center}>
        <Text style={styles.icon}>🔴</Text>
        <Text style={styles.text}>Lives estão em desenvolvimento</Text>
        <Text style={styles.sub}>Em breve disponível no app Android</Text>
        <Text style={styles.info}>Use o navegador em bluetubeviral.com para assistir lives agora</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 10 },
  icon: { fontSize: 60 },
  text: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sub: { color: COLORS.textSecondary, fontSize: 13 },
  info: { color: COLORS.textDim, fontSize: 11, marginTop: 20, textAlign: 'center' },
});
