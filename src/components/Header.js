import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants';

export default function Header({ title, showBack, right }) {
  const nav = useNavigation();
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.container}>
        {showBack ? (
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.btn}>
            <Ionicons name="arrow-back" color={COLORS.text} size={24} />
          </TouchableOpacity>
        ) : <View style={styles.btn} />}
        <Text style={styles.title}>{title}</Text>
        <View style={styles.btn}>{right}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: COLORS.background },
  container: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
});
