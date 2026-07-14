import { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants';
import LogoBlueTube from '../components/LogoBlueTube';

const { width: W, height: H } = Dimensions.get('window');

function Particle({ delay, x, size }) {
  const y = useRef(new Animated.Value(H + 20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(y, { toValue: -40, duration: 4000 + delay, useNativeDriver: true, easing: Easing.linear }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
            Animated.delay(2400),
            Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(y, { toValue: H + 20, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={[
        styles.particle,
        { left: x, width: size, height: size, transform: [{ translateY: y }], opacity },
      ]}
    />
  );
}

export default function SplashScreen({ onFinish }) {
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoScale, { toValue: 1, duration: 600, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(taglineY, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.delay(1200),
    ]);
    anim.start(({ finished }) => { if (finished && onFinish) onFinish(); });
    return () => anim.stop();
  }, []);

  const particles = Array.from({ length: 8 }, (_, i) => ({
    key: i,
    delay: i * 300,
    x: (W / 8) * i + Math.random() * 30,
    size: 3 + Math.random() * 4,
  }));

  return (
    <LinearGradient colors={[COLORS.background, COLORS.surface]} style={styles.root}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      {particles.map((p) => <Particle {...p} />)}
      <Animated.View style={{ transform: [{ scale: logoScale }], opacity: logoOpacity }}>
        <LogoBlueTube width={260} height={150} variant="stacked" tagline />
      </Animated.View>
      <Animated.Text
        style={[styles.tagline, { opacity: taglineOpacity, transform: [{ translateY: taglineY }] }]}
      >
        A nova rede social de vídeos do Brasil
      </Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tagline: { color: COLORS.accent, fontSize: 14, marginTop: 18, letterSpacing: 0.3, fontWeight: '600' },
  particle: { position: 'absolute', borderRadius: 999, backgroundColor: COLORS.accent },
});
