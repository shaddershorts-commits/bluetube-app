import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

function fmt(n) {
  n = parseInt(n) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

export default function ActionButton({ icon, count, onPress, active, color }) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress}>
      <Ionicons name={icon} size={30} color={active ? (color || COLORS.red) : '#fff'} />
      {count !== undefined && <Text style={styles.count}>{fmt(count)}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', marginVertical: 10 },
  count: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 2, textShadowColor: 'rgba(0,0,0,.5)', textShadowRadius: 2 },
});
