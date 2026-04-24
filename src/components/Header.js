// src/components/Header.js
// Header com fundo blur (Liquid Glass — Lote 8). SafeArea no topo,
// BlurView dark medium + borda inferior translucida (estilo iOS nav bar).
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, blur as blurT, fontSize, fontWeight } from '../constants/theme';

export default function Header({ title, showBack, right }) {
  const nav = useNavigation();
  return (
    <View style={styles.wrap}>
      <BlurView intensity={blurT.medium} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassDark }]} pointerEvents="none" />
      <SafeAreaView edges={['top']}>
        <View style={styles.container}>
          {showBack ? (
            <TouchableOpacity onPress={() => nav.goBack()} style={styles.btn} hitSlop={8}>
              <Ionicons name="arrow-back" color={colors.text} size={24} />
            </TouchableOpacity>
          ) : <View style={styles.btn} />}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <View style={styles.btn}>{right}</View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderGlass,
  },
  container: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold, flex: 1, textAlign: 'center' },
});
