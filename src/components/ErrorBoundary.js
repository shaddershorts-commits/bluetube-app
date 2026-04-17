import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { captureError } from '../utils/sentry';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    captureError(error, {
      componentStack: info?.componentStack,
      location: 'ErrorBoundary',
    });
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>😓</Text>
          <Text style={styles.title}>Algo deu errado</Text>
          <Text style={styles.sub}>
            Nossa equipe foi notificada e está corrigindo.{'\n'}Tente reabrir o app.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={this.reset} activeOpacity={0.85}>
            <Text style={styles.btnText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020817',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emoji: { fontSize: 64, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '900', color: '#e8f4ff', marginBottom: 12, letterSpacing: -0.5 },
  sub: { fontSize: 15, color: 'rgba(232,244,255,0.5)', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  btn: { backgroundColor: '#1a6bff', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
