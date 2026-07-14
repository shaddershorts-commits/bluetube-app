import { useEffect } from 'react';
import { Platform, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import * as NavigationBar from 'expo-navigation-bar';
import Navigation from './src/navigation';
import { useAuthStore, useFeedStore } from './src/store';
import { useLangStore } from './src/i18n';
import ErrorBoundary from './src/components/ErrorBoundary';
import { initSentry, setUserContext, wrap } from './src/utils/sentry';

// Sentry precisa inicializar antes de qualquer render
initSentry();

function App() {
  const init = useAuthStore((s) => s.init);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    init();
    useLangStore.getState().init();
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#020817').catch(() => {});
      NavigationBar.setButtonStyleAsync('light').catch(() => {});
    }
    // Pausa videos quando o app vai pro background (Android continuava tocando audio)
    const sub = AppState.addEventListener('change', (st) => {
      useFeedStore.getState().setAppActive(st === 'active');
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (user) setUserContext(user);
  }, [user]);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" translucent backgroundColor="transparent" />
          <Navigation />
          <Toast />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

export default wrap(App);
