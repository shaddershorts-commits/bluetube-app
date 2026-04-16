import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

/**
 * SkeletonCard — shimmer animado enquanto o video do feed carrega.
 * Usa Animated loop com opacity oscilando entre 0.3 e 0.6.
 */
export default function SkeletonCard({ style }) {
    const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
        const anim = Animated.loop(
                Animated.sequence([
                          Animated.timing(opacity, {
                                      toValue: 0.6,
                                      duration: 750,
                                      useNativeDriver: true,
                          }),
                          Animated.timing(opacity, {
                                      toValue: 0.3,
                                      duration: 750,
                                      useNativeDriver: true,
                          }),
                        ])
              );
        anim.start();
        return () => anim.stop();
  }, []);

  return (
        <Animated.View style={[styles.card, { opacity }, style]}>
  {/* Fundo escuro simulando o video */}
          <View style={styles.videoBg} />

  {/* Barra de progresso na base */}
          <View style={styles.bottomRow}>
  {/* Avatar circular */}
            <View style={styles.avatar} />
{/* Linhas de texto */}
        <View style={styles.textCol}>
          <View style={[styles.line, { width: '70%' }]} />
                    <View style={[styles.line, { width: '45%', marginTop: 8 }]} />
          </View>
{/* Botoes de acao */}
        <View style={styles.actions}>
        {[0, 1, 2].map(i => (
                      <View key={i} style={[styles.actionBtn, { marginBottom: 20 }]} />
                    ))}
</View>
  </View>
  </Animated.View>
  );
}

const styles = StyleSheet.create({
    card: {
          width: W,
          height: H,
          backgroundColor: '#0a1628',
          justifyContent: 'flex-end',
    },
    videoBg: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(255,255,255,0.04)',
    },
    bottomRow: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          padding: 16,
          paddingBottom: 90,
          gap: 12,
    },
    avatar: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: 'rgba(255,255,255,0.12)',
    },
    textCol: {
          flex: 1,
          justifyContent: 'flex-end',
    },
    line: {
          height: 12,
          borderRadius: 6,
          backgroundColor: 'rgba(255,255,255,0.12)',
    },
    actions: {
          width: 40,
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: 4,
    },
    actionBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.12)',
    },
});
