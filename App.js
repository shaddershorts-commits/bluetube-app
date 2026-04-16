import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import * as NavigationBar from 'expo-navigation-bar';
import Navigation from './src/navigation';
import { useAuthStore } from './src/store';

export default function App() {
    const init = useAuthStore((s) => s.init);

  useEffect(() => {
        init();

                // Passo 10: NavigationBar Android — fundo escuro com botoes claros
                if (Platform.OS === 'android') {
                        NavigationBar.setBackgroundColorAsync('#020817').catch(() => {});
                        NavigationBar.setButtonStyleAsync('light').catch(() => {});
                }
  }, []);

  return (
        <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
          <StatusBar style="light" translucent backgroundColor="transparent" />
          <Navigation />
{/* Passo 10: Toast global — use Toast.show() em qualquer lugar */}
        <Toast />
  </SafeAreaProvider>
  </GestureHandlerRootView>
  );
}
