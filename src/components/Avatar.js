import { Image, View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

export default function Avatar({ uri, size = 40, initial }) {
  const s = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={[styles.img, s]} />;
  return (
    <View style={[styles.fallback, s]}>
      <Text style={[styles.initial, { fontSize: size / 2.5 }]}>{(initial || '?').charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  img: { backgroundColor: '#111' },
  fallback: { backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#fff', fontWeight: '700' },
});
