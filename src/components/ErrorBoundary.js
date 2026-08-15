import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { captureError } from '../utils/sentry';
import { COLORS } from '../constants';

// Dois modos:
//  - RAIZ (App.js): tela cheia. "Tentar novamente" remonta a árvore inteira —
//    por isso parece que o app reiniciou.
//  - compact (dentro de uma tela): isola o erro num pedaço da UI. Um erro de
//    render numa lista não derruba mais o app inteiro; mostra retry local e
//    chama onReset (ex.: limpar a busca) antes de tentar de novo.
//
// Estilos INLINE de propósito: este módulo é importado por App.js ANTES de
// applyMode() rodar, então um StyleSheet.create aqui congelaria a paleta
// escura e o fallback sairia ilegível no tema claro. Lendo COLORS.* na hora
// do render, a tela de erro acompanha o tema. Custo só existe quando há erro.
export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    captureError(error, {
      componentStack: info?.componentStack,
      location: this.props.scope || 'ErrorBoundary',
      ...(this.props.context || {}),
    });
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    try { this.props.onReset?.(); } catch (e) {}
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.compact) {
      return (
        <View style={this.props.fill
          ? { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 28, backgroundColor: COLORS.background }
          : { padding: 28, alignItems: 'center', gap: 8 }}>
          <Text style={{ color: COLORS.text, fontSize: 14.5, fontWeight: '700' }}>
            Não deu pra mostrar isso agora
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, textAlign: 'center' }} numberOfLines={2}>
            {String(this.state.error?.message || 'Erro inesperado')}
          </Text>
          <TouchableOpacity
            style={{ marginTop: 6, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}
            onPress={this.reset}
            activeOpacity={0.85}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Tentar de novo</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 64, marginBottom: 24 }}>😓</Text>
        <Text style={{ fontSize: 24, fontWeight: '900', color: COLORS.text, marginBottom: 12, letterSpacing: -0.5 }}>
          Algo deu errado
        </Text>
        <Text style={{ fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
          Nossa equipe foi notificada e está corrigindo.{'\n'}Tente reabrir o app.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14 }}
          onPress={this.reset}
          activeOpacity={0.85}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

// HOC pra dar a CADA tela sua própria cerca: um crash de render numa tela mostra
// "tentar de novo" só ALI (remonta a tela) em vez de derrubar o app inteiro e
// resetar a navegação. O boundary raiz (App.js) continua como última defesa.
export function withErrorBoundary(Component, scope) {
  const Wrapped = (props) => (
    <ErrorBoundary compact fill scope={scope}>
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withBoundary(${scope || 'Screen'})`;
  return Wrapped;
}
