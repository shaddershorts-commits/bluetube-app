import { useState, useRef } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store';
import { COLORS } from '../constants';
import LogoBlueTube from '../components/LogoBlueTube';

const { width: W, height: H } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    img: 'https://bluetubeviral.com/blublu-happy.png',
    emoji: null,
    title: 'O futuro do vídeo\nbrasileiro é aqui.',
    sub: 'Shorts virais, lives ao vivo e uma comunidade que cresce todo dia.',
  },
  {
    id: '2',
    img: 'https://bluetubeviral.com/blublu-pointing.png',
    emoji: null,
    title: 'Grave. Edite.\nViralize.',
    sub: 'Câmera nativa com filtros, múltiplos clipes e publicação em 1 toque.',
  },
  {
    id: '3',
    img: null,
    emoji: '💰',
    title: 'Seus vídeos\nvalem dinheiro.',
    sub: 'Gorjetas ao vivo, fundo de criadores e loja própria. Comece a monetizar hoje.',
  },
  {
    id: '4',
    img: null,
    emoji: '🫂',
    title: 'Uma comunidade\nde criadores reais.',
    sub: 'Lives, grupos por nicho, BlueChat e stories que somem em 24h.',
  },
  {
    id: '5',
    img: 'https://bluetubeviral.com/blublu-thumbsup.png',
    emoji: null,
    title: 'Seja um dos\nprimeiros do Blue.',
    sub: 'Criadores que chegam agora têm vantagem. O algoritmo favorece os pioneiros.',
    cta: true,
  },
];

function Slide({ item }) {
  return (
    <View style={styles.slide}>
      <View style={styles.mediaWrap}>
        {item.img ? (
          <Image source={{ uri: item.img }} style={styles.img} resizeMode="contain" />
        ) : (
          <Text style={styles.emoji}>{item.emoji}</Text>
        )}
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.sub}>{item.sub}</Text>
    </View>
  );
}

export default function IntroScreen({ navigation }) {
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);
  const markIntroSeen = useAuthStore((s) => s.markIntroSeen);

  const finish = async (mode) => {
    navigation.replace('Login', { mode });
    await markIntroSeen();
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    }
  };

  const onScroll = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / W);
    if (i !== index) setIndex(i);
  };

  const current = SLIDES[index];

  return (
    <LinearGradient colors={[COLORS.background, COLORS.surface]} style={{ flex: 1 }}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <View style={styles.topBar}>
        <LogoBlueTube width={110} height={32} />
        {!current.cta && (
          <TouchableOpacity onPress={() => finish('signup')} style={styles.skip}>
            <Text style={styles.skipText}>Pular</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => <Slide item={item} />}
        style={styles.list}
      />

      <View style={styles.dotsWrap}>
        {SLIDES.map((s, i) => (
          <View key={s.id} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        {current.cta ? (
          <>
            <TouchableOpacity activeOpacity={0.85} onPress={() => finish('signup')} style={styles.ctaWrap}>
              <LinearGradient colors={[COLORS.primary, COLORS.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
                <Text style={styles.ctaText}>Criar minha conta →</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => finish('signin')} style={styles.ctaSecondary}>
              <Text style={styles.ctaSecondaryText}>Já tenho conta</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity activeOpacity={0.85} onPress={next} style={styles.ctaWrap}>
            <LinearGradient colors={[COLORS.primary, COLORS.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
              <Text style={styles.ctaText}>Próximo →</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingTop: 52, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skip: { padding: 8 },
  skipText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  list: { flex: 1 },
  slide: { width: W, alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 32, paddingTop: 20 },
  mediaWrap: { width: W * 0.7, height: H * 0.36, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  img: { width: '100%', height: '100%' },
  emoji: { fontSize: 140 },
  title: { color: COLORS.text, fontSize: 30, fontWeight: '900', textAlign: 'center', letterSpacing: -0.8, lineHeight: 36, marginBottom: 14 },
  sub: { color: COLORS.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  dotsWrap: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive: { backgroundColor: COLORS.accent, width: 24 },
  footer: { paddingHorizontal: 28, paddingBottom: 44, gap: 14 },
  ctaWrap: { borderRadius: 14, shadowColor: COLORS.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  cta: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  ctaSecondary: { alignItems: 'center', padding: 10 },
  ctaSecondaryText: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
});
