import { useState, useEffect } from 'react';
import { Linking as RNLinking, Image, View } from 'react-native';
import * as Linking from 'expo-linking';
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
import PostVideoScreen from '../screens/PostVideoScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import HashtagScreen from '../screens/HashtagScreen';
import SavedScreen from '../screens/SavedScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import MonetizacaoScreen from '../screens/MonetizacaoScreen';
import SettingsScreen from '../screens/SettingsScreen';

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

// Deep linking config — suporta:
//   bluetube://               -> Feed (tab default)
//   https://bluetubeviral.com/blue              -> Feed
//   https://bluetubeviral.com/blue/@username    -> PerfilUsuario{username}
//   https://bluetubeviral.com/blue/hashtag/foo  -> Hashtag{tag}
//   https://bluetubeviral.com/blue/v/:id        -> fallback web (abre browser)
// /blue/v/:id nao tem tela nativa ainda — tratado via listener mais abaixo.
const linking = {
    prefixes: ['bluetube://', 'https://bluetubeviral.com', 'http://bluetubeviral.com'],
    config: {
          screens: {
                Main: {
                      screens: {
                            Feed: 'blue',
                            Descobrir: 'blue/descobrir',
                      },
                },
                PerfilUsuario: {
                      path: 'blue/@:username',
                      parse: { username: (u) => u },
                },
                Hashtag: {
                      path: 'blue/hashtag/:tag',
                      parse: { tag: (t) => decodeURIComponent(t) },
                },
          },
    },
    // /blue/v/:id nao mapeia pra tela nativa — abre no navegador externo
    async getInitialURL() {
          const url = await RNLinking.getInitialURL();
          if (url && /\/blue\/v\/[^/?#]+/.test(url)) {
                RNLinking.openURL(url).catch(() => {});
                return null;
          }
          return url;
    },
    subscribe(listener) {
          const sub = RNLinking.addEventListener('url', ({ url }) => {
                if (/\/blue\/v\/[^/?#]+/.test(url)) {
                      RNLinking.openURL(url).catch(() => {});
                      return;
                }
                listener(url);
          });
          return () => sub.remove();
    },
};

// Icone da aba Perfil: usa avatar do user logado se disponivel, senao ionicon.
// Carrega 1x na montagem do tab bar (cache em memoria) — nao re-fetcha a cada
// re-render. Re-monta quando token muda (logout/login).
function PerfilTabIcon({ color, focused }) {
  const token = useAuthStore((s) => s.token);
  const [avatarUrl, setAvatarUrl] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (!token) { setAvatarUrl(null); return; }
    blueAPI.meuPerfil()
      .then((d) => { if (!cancelled && d?.profile?.avatar_url) setAvatarUrl(d.profile.avatar_url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token]);
  if (avatarUrl) {
    return (
      <View style={{
        width: 30, height: 30, borderRadius: 15, padding: 0,
        borderWidth: focused ? 2 : 1.5,
        borderColor: focused ? COLORS.neon : 'rgba(255,255,255,0.25)',
        overflow: 'hidden',
      }}>
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: '100%', height: '100%', borderRadius: 15 }}
        />
      </View>
    );
  }
  return <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={24} />;
}

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
                              if (route.name === 'Perfil') return <PerfilTabIcon color={color} focused={focused} />;
                              const icons = { Feed: 'home', Descobrir: 'search', Camera: 'add-circle', Chat: 'chatbubble' };
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
        <NavigationContainer theme={NAV_THEME} linking={linking}>
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
                       <Stack.Screen name="PostVideo" component={PostVideoScreen} />
                       <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                       <Stack.Screen name="Hashtag" component={HashtagScreen} />
                       <Stack.Screen name="Saved" component={SavedScreen} />
                       <Stack.Screen name="Notifications" component={NotificationsScreen} />
                       <Stack.Screen name="Analytics" component={AnalyticsScreen} />
                       <Stack.Screen name="Monetizacao" component={MonetizacaoScreen} />
                       <Stack.Screen name="Settings" component={SettingsScreen} />
           </>
         )}
</Stack.Navigator>
  </NavigationContainer>
  );
}
