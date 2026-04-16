import { useState, useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store';
import { COLORS } from '../constants';
import blueAPI from '../api';
import SplashScreen from '../screens/SplashScreen';
import IntroScreen from '../screens/IntroScreen';
import LoginScreen from '../screens/LoginScreen';
import CadastroScreen from '../screens/CadastroScreen';
import OTPScreen from '../screens/OTPScreen';
import SetupPerfilScreen from '../screens/SetupPerfilScreen';
import FeedScreen from '../screens/FeedScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import CameraScreen from '../screens/CameraScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ConversaScreen from '../screens/ConversaScreen';
import PerfilUsuarioScreen from '../screens/PerfilUsuarioScreen';
import ComentariosScreen from '../screens/ComentariosScreen';
import LiveScreen from '../screens/LiveScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const NAV_THEME = {
    ...DarkTheme,
    colors: {
          ...DarkTheme.colors,
          background: COLORS.background,
          card: COLORS.background,
          text: COLORS.text,
          primary: COLORS.neon,
          border: COLORS.border,
    },
};

function MainTabs() {
    return (
          <Tab.Navigator
        screenOptions={({ route }) => ({
                  headerShown: false,
                  tabBarStyle: {
                              backgroundColor: COLORS.background,
                              borderTopColor: COLORS.border,
                              height: 60, paddingBottom: 6, paddingTop: 6,
                  },
                  tabBarActiveTintColor: COLORS.neon,
                  tabBarInactiveTintColor: COLORS.textDim,
                  tabBarLabelStyle: { fontSize: 10 },
                  tabBarIcon: ({ color, focused }) => {
                              const icons = { Feed: 'home', Descobrir: 'search', Camera: 'add-circle', Chat: 'chatbubble', Perfil: 'person' };
                              const name = icons[route.name] + (focused ? '' : '-outline');
                              return <Ionicons name={name} color={color} size={route.name === 'Camera' ? 38 : 24} />;
},
                                       })}>
      <Tab.Screen name="Feed" component={FeedScreen} />
        <Tab.Screen name="Descobrir" component={DiscoverScreen} />
        <Tab.Screen name="Camera" component={CameraScreen} options={{ tabBarLabel: '' }} />
      <Tab.Screen name="Chat" component={ChatScreen} />
        <Tab.Screen name="Perfil" component={ProfileScreen} />
  </Tab.Navigator>
  );
}

// Verifica onboarding e redireciona se necessario
function MainWithOnboarding({ navigation }) {
    useEffect(() => {
          let cancelled = false;
          blueAPI.onboardingStatus().then(d => {
                  if (cancelled) return;
                  // Se backend retornar status incompleto, redirecionar para SetupPerfil
                                                if (d && (d.status === 'incomplete' || d.onboarding_completed === false)) {
                                                          navigation.replace('SetupPerfil');
                                                }
          }).catch(() => {}); // Silencioso: se falhar, mostra Main normalmente
                  return () => { cancelled = true; };
    }, []);

  return <MainTabs />;
    }

export default function Navigation() {
    const { token, isLoading, introSeen } = useAuthStore();
    const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
        const t = setTimeout(() => setSplashDone(true), 3000);
        return () => clearTimeout(t);
  }, []);

  if (isLoading || !splashDone) {
        return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  return (
        <NavigationContainer theme={NAV_THEME}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
{!token ? (
            <>
{!introSeen && <Stack.Screen name="Intro" component={IntroScreen} />}
            <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Cadastro" component={CadastroScreen} />
              <Stack.Screen name="OTP" component={OTPScreen} />
  </>
         ) : (
                     <>
                       <Stack.Screen name="Main" component={MainWithOnboarding} />
                       <Stack.Screen name="SetupPerfil" component={SetupPerfilScreen} />
                       <Stack.Screen name="Conversa" component={ConversaScreen} />
                       <Stack.Screen name="PerfilUsuario" component={PerfilUsuarioScreen} />
                       <Stack.Screen name="Comentarios" component={ComentariosScreen} />
                       <Stack.Screen name="Live" component={LiveScreen} />
           </>
         )}
</Stack.Navigator>
  </NavigationContainer>
  );
}
