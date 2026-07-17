import { useEffect, useState } from 'react';
import { Platform, AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import * as NavigationBar from 'expo-navigation-bar';
import * as SecureStore from 'expo-secure-store';
import { COLORS, applyMode } from './src/constants';
import { useAuthStore, useFeedStore } from './src/store';
import { useLangStore } from './src/i18n';
import ErrorBoundary from './src/components/ErrorBoundary';
import { initSentry, setUserContext, wrap } from './src/utils/sentry';

// Sentry precisa inicializar antes de qualquer render
initSentry();

function App() {
  const init = useAuthStore((s) => s.init);
  const user = useAuthStore((s) => s.user);
  // Tema claro/escuro GLOBAL: aplica a paleta salva ANTES de importar as telas
  // (require tardio), pra todo StyleSheet.create nascer com as cores certas.
  const [Nav, setNav] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const m = await SecureStore.getItemAsync('bt_app_mode');
        applyMode(m === 'light' ? 'light' : 'dark');
      } catch (e) { /* dark default */ }
      const N = require('./src/navigation').default;
      setNav(() => N);
      if (Platform.OS === 'android') {
        NavigationBar.setBackgroundColorAsync(COLORS.background).catch(() => {});
        NavigationBar.setButtonStyleAsync(COLORS.mode === 'light' ? 'dark' : 'light').catch(() => {});
      }
    })();
  }, []);

  useEffect(() => {
    init();
    useLangStore.getState().init();
    // Pausa videos quando o app vai pro background (Android continuava tocando audio)
    // + presença do chat (online / visto por último): heartbeat a cada 60s em
    // foreground, 'offline' ao ir pro background. Fail-soft (sem token = no-op).
    const blueAPI = require('./src/api').default;
    const beat = (status) => {
      if (useAuthStore.getState().token) blueAPI.chatStatus(status).catch(() => {});
    };
    beat('online');
    const hb = setInterval(() => {
      if (AppState.currentState === 'active') beat('online');
    }, 60000);
    const sub = AppState.addEventListener('change', (st) => {
      useFeedStore.getState().setAppActive(st === 'active');
      beat(st === 'active' ? 'online' : 'offline');
    });
    return () => { sub.remove(); clearInterval(hb); };
  }, []);

  useEffect(() => {
    if (user) setUserContext(user);
  }, [user]);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style={COLORS.mode === 'light' ? 'dark' : 'light'} translucent backgroundColor="transparent" />
          {Nav ? <Nav /> : <View style={{ flex: 1, backgroundColor: '#020817' }} />}
          <Toast />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

export default wrap(App);
