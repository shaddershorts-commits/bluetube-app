import { useState, useEffect } from 'react';
import { Linking as RNLinking, Image, View, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { BlurView } from 'expo-blur';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store';
import { isGuest } from '../utils/requireAuth';
import { COLORS } from '../constants';
import { colors as theme, blur as blurT } from '../constants/theme';
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
import GrupoInfoScreen from '../screens/GrupoInfoScreen';
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
import VideoScreen from '../screens/VideoScreen';
import StoryViewerScreen from '../screens/StoryViewerScreen';
import CriarGrupoScreen from '../screens/CriarGrupoScreen';

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
                // /blue/v/:id agora abre NATIVO (VideoScreen) — antes caia no navegador
                Video: {
                      path: 'blue/v/:video_id',
                      parse: { video_id: (v) => v },
                },
          },
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
    const insets = useSafeAreaInsets();
    return (
          <Tab.Navigator
        screenOptions={({ route }) => ({
                  headerShown: false,
                  // Pill flutuante estilo Instagram: menor, icones centralizados
                  // verticalmente, fundo mais claro com mais blur (liquid glass).
                  tabBarStyle: {
                              position: 'absolute',
                              bottom: Math.max(insets.bottom, 10) + 8,
                              left: 34,
                              right: 34,
                              height: 54,
                              borderRadius: 27,
                              backgroundColor: 'transparent',
                              borderTopWidth: 0,
                              overflow: 'hidden',
                              elevation: 0,
                              shadowColor: '#000',
                              shadowOpacity: 0.3,
                              shadowRadius: 14,
                              shadowOffset: { width: 0, height: 6 },
                  },
                  tabBarItemStyle: { height: 54, justifyContent: 'center', alignItems: 'center', paddingTop: 0, paddingBottom: 0 },
                  tabBarShowLabel: false,
                  tabBarBackground: () => (
                              <View style={[StyleSheet.absoluteFill, { borderRadius: 27, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' }]}>
                                <BlurView intensity={95} tint="light" style={StyleSheet.absoluteFill} />
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(90,130,190,0.22)' }]} />
                              </View>
                  ),
                  tabBarActiveTintColor: COLORS.neon,
                  tabBarInactiveTintColor: 'rgba(255,255,255,0.75)',
                  tabBarIcon: ({ color, focused }) => {
                              if (route.name === 'Perfil') return <PerfilTabIcon color={color} focused={focused} />;
                              const icons = { Feed: 'home', Descobrir: 'search', Camera: 'add-circle', Chat: 'chatbubble' };
                              const name = icons[route.name] + (focused ? '' : '-outline');
                              return <Ionicons name={name} color={color} size={route.name === 'Camera' ? 30 : 22} />;
},
                                       })}
        screenListeners={({ navigation, route }) => ({
                  tabPress: (e) => {
                    // Guest tentando Postar/Chat/Perfil → abre login (guest-first).
                    if (['Camera', 'Chat', 'Perfil'].includes(route.name) && isGuest()) {
                      e.preventDefault();
                      navigation.navigate('Login', { reason: route.name === 'Camera' ? 'postar' : route.name === 'Chat' ? 'conversar' : 'perfil' });
                      return;
                    }
                    // Double-tap no icone da aba ATIVA recarregava a tela — bloqueia.
                    if (navigation.isFocused()) e.preventDefault();
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

// Verifica onboarding e redireciona se necessario.
// GUEST-FIRST: so checa onboarding se houver token (guest cai direto no feed).
function MainWithOnboarding({ navigation }) {
    const token = useAuthStore((s) => s.token);
    useEffect(() => {
          if (!token) return; // guest: sem onboarding, vai direto pro feed
          let cancelled = false;
          blueAPI.onboardingStatus().then(d => {
                  if (cancelled) return;
                  // Se backend retornar status incompleto, redirecionar para SetupPerfil
                                                if (d && (d.status === 'incomplete' || d.onboarding_completed === false)) {
                                                          navigation.navigate('SetupPerfil');
                                                }
          }).catch(() => {}); // Silencioso: se falhar, mostra Main normalmente
                  return () => { cancelled = true; };
    }, [token]);

  return <MainTabs />;
    }

export default function Navigation() {
    const { isLoading } = useAuthStore();
    const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
        const t = setTimeout(() => setSplashDone(true), 3000);
        return () => clearTimeout(t);
  }, []);

  if (isLoading || !splashDone) {
        return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  // GUEST-FIRST: apos o splash cai direto no feed (Main). Login/Cadastro/OTP
  // sao MODAIS acionados quando o guest tenta interagir (via requireAuth).
  // Todas as telas ficam sempre montadas; o gate de login vive nas acoes.
  return (
        <NavigationContainer theme={NAV_THEME} linking={linking}>
          <Stack.Navigator initialRouteName="Main" screenOptions={{ headerShown: false }}>
                       <Stack.Screen name="Main" component={MainWithOnboarding} />
                       <Stack.Group screenOptions={{ presentation: 'modal' }}>
                         <Stack.Screen name="Login" component={LoginScreen} />
                         <Stack.Screen name="Cadastro" component={CadastroScreen} />
                         <Stack.Screen name="OTP" component={OTPScreen} />
                       </Stack.Group>
                       <Stack.Screen name="SetupPerfil" component={SetupPerfilScreen} />
                       <Stack.Screen name="Conversa" component={ConversaScreen} />
                       <Stack.Screen name="GrupoInfo" component={GrupoInfoScreen} />
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
                       <Stack.Screen name="Video" component={VideoScreen} />
                       <Stack.Screen name="StoryViewer" component={StoryViewerScreen} />
                       <Stack.Screen name="CriarGrupo" component={CriarGrupoScreen} />
</Stack.Navigator>
  </NavigationContainer>
  );
}
