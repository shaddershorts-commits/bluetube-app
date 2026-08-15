import { useState, useEffect } from 'react';
import { Linking as RNLinking, Image, View, StyleSheet, DeviceEventEmitter } from 'react-native';
import * as Linking from 'expo-linking';
import { BlurView } from 'expo-blur';
import { NavigationContainer, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
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
import TemasScreen from '../screens/TemasScreen';
import AtividadeScreen from '../screens/AtividadeScreen';
import StoryEditorScreen from '../screens/StoryEditorScreen';
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
import FollowListScreen from '../screens/FollowListScreen';
import CallScreen from '../screens/CallScreen';
import { supabase, autenticarRealtime } from '../lib/supabase';
import { withErrorBoundary } from '../components/ErrorBoundary';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Cada tela ganha sua PRÓPRIA cerca de erro: um crash de render numa tela mostra
// "tentar de novo" SÓ ali (remonta a tela) em vez de resetar o app inteiro. O
// boundary raiz (App.js) segue como última defesa. Cache pra referência estável
// — chamar withErrorBoundary inline no JSX remontaria a tela a cada render.
const _ebCache = new Map();
function T(Component, name) {
  if (!_ebCache.has(Component)) _ebCache.set(Component, withErrorBoundary(Component, name));
  return _ebCache.get(Component);
}

// Ref global de navegação: deixa código FORA da árvore de telas navegar
// (ex.: toque num push de chamada, tratado no useNotifications do App.js).
export const navigationRef = createNavigationContainerRef();

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
    // Badge de MENSAGENS NÃO LIDAS na tab do Chat (user 2026-07-24): poll a
    // cada 45s + ao voltar pro app; some ao zerar. Guest = sem poll.
    const token = useAuthStore((s) => s.token);
    const [chatUnread, setChatUnread] = useState(0);
    // Tela de captura (CameraScreen) pede pra sumir com a pill flutuante
    // enquanto grava/revisa — senao ela fica por cima dos controles.
    const [esconderTabBar, setEsconderTabBar] = useState(false);
    useEffect(() => {
      const sub = DeviceEventEmitter.addListener('bt-tabbar-hide', (v) => setEsconderTabBar(!!v));
      return () => sub.remove();
    }, []);
    useEffect(() => {
      if (!token) { setChatUnread(0); return; }
      let alive = true;
      const check = () => {
        blueAPI.chatUnreadCount()
          .then((d) => { if (alive && typeof d?.count === 'number') setChatUnread(d.count); })
          .catch(() => {});
      };
      check();
      const iv = setInterval(check, 45000);
      const sub = DeviceEventEmitter.addListener('bt-tab-reselect', (tab) => { if (tab === 'Chat') setTimeout(check, 1500); });
      return () => { alive = false; clearInterval(iv); sub.remove(); };
    }, [token]);
    return (
          <Tab.Navigator
        screenOptions={({ route }) => ({
                  headerShown: false,
                  // Pill flutuante estilo Instagram: menor, icones centralizados
                  // verticalmente, fundo mais claro com mais blur (liquid glass).
                  // A pill fica ACIMA de tudo (position absolute) e cobria os
                  // botoes da camera/preview do storie — por isso a tela de
                  // captura pede pra escondê-la via evento 'bt-tabbar'.
                  tabBarStyle: esconderTabBar ? { display: 'none' } : {
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
                              <View style={[StyleSheet.absoluteFill, { borderRadius: 27, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.mode === 'light' ? 'rgba(26,107,255,0.25)' : 'rgba(255,255,255,0.16)' }]}>
                                <BlurView intensity={95} tint="light" style={StyleSheet.absoluteFill} />
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.mode === 'light' ? 'rgba(255,255,255,0.72)' : 'rgba(90,130,190,0.22)' }]} />
                              </View>
                  ),
                  tabBarActiveTintColor: COLORS.mode === 'light' ? '#1a6bff' : COLORS.neon,
                  tabBarInactiveTintColor: COLORS.mode === 'light' ? 'rgba(11,21,38,0.55)' : 'rgba(255,255,255,0.75)',
                  tabBarIcon: ({ color, focused }) => {
                              if (route.name === 'Perfil') return <PerfilTabIcon color={color} focused={focused} />;
                              const icons = { Feed: 'play-circle', Descobrir: 'search', Camera: 'add-circle', Chat: 'chatbubble' };
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
                    // Toque na aba JÁ ATIVA = refresh controlado (estilo Instagram):
                    // bloqueia a remontagem e avisa a tela pra voltar ao topo + recarregar.
                    if (navigation.isFocused()) {
                      e.preventDefault();
                      DeviceEventEmitter.emit('bt-tab-reselect', route.name);
                    }
                  },
        })}>
      <Tab.Screen name="Feed" component={T(FeedScreen, 'Feed')} />
        <Tab.Screen name="Descobrir" component={T(DiscoverScreen, 'Descobrir')} />
        <Tab.Screen name="Camera" component={T(CameraScreen, 'Camera')} options={{ tabBarLabel: '' }} />
      <Tab.Screen name="Chat" component={T(ChatScreen, 'Chat')}
        options={chatUnread > 0 ? { tabBarBadge: chatUnread > 99 ? '99+' : chatUnread, tabBarBadgeStyle: { backgroundColor: '#ef4444', color: '#fff', fontSize: 10, fontWeight: '800' } } : {}} />
        <Tab.Screen name="Perfil" component={T(ProfileScreen, 'Perfil')} />
  </Tab.Navigator>
  );
}

// ── CHAMADA RECEBIDA com o app ABERTO ───────────────────────────────────────
// Assina o canal Realtime `ring-<meuId>` enquanto houver login. Quem liga
// dispara um broadcast 'ring' nesse canal logo após criar a chamada; aqui a
// gente navega pra CallScreen no modo incoming (que toca o ringtone e valida
// na API se a chamada ainda está de pé). App FECHADO é coberto pelo push FCM
// (useNotifications roteia o toque na notificação pra cá também).
function useIncomingCallRing(navigation) {
  const userId = useAuthStore((s) => s.user?.id);
  useEffect(() => {
    if (!userId) return;
    let vivo = true;
    let ch = null;
    // Manda o JWT antes de entrar no canal (auditoria 11/08): sem isso o
    // Realtime só conhece a chave pública do APK e qualquer um entra no
    // `ring-` de qualquer pessoa. Se falhar, entra assim mesmo — a campainha
    // não pode parar de tocar por causa do SecureStore.
    autenticarRealtime().finally(() => {
      if (!vivo) return;
      ch = supabase.channel(`ring-${userId}`);
      ch.on('broadcast', { event: 'ring' }, ({ payload }) => {
        if (!payload?.call_id) return;
        try {
          navigation.navigate('Call', {
            mode: 'incoming',
            callId: payload.call_id,
            tipo: payload.tipo === 'video' ? 'video' : 'audio',
            other: payload.caller || null,
          });
        } catch (e) {}
      });
      ch.subscribe();
    });
    return () => {
      vivo = false;
      try { if (ch) supabase.removeChannel(ch); } catch (e) {}
    };
  }, [userId, navigation]);
}

// Verifica onboarding e redireciona se necessario.
// GUEST-FIRST: so checa onboarding se houver token (guest cai direto no feed).
function MainWithOnboarding({ navigation }) {
    const token = useAuthStore((s) => s.token);
    useIncomingCallRing(navigation);
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
        <NavigationContainer ref={navigationRef} theme={NAV_THEME} linking={linking}>
          <Stack.Navigator initialRouteName="Main" screenOptions={{ headerShown: false }}>
                       <Stack.Screen name="Main" component={T(MainWithOnboarding, 'Main')} />
                       <Stack.Group screenOptions={{ presentation: 'modal' }}>
                         <Stack.Screen name="Login" component={T(LoginScreen, 'Login')} />
                         <Stack.Screen name="Cadastro" component={T(CadastroScreen, 'Cadastro')} />
                         <Stack.Screen name="OTP" component={T(OTPScreen, 'OTP')} />
                       </Stack.Group>
                       <Stack.Screen name="SetupPerfil" component={T(SetupPerfilScreen, 'SetupPerfil')} />
                       <Stack.Screen name="Conversa" component={T(ConversaScreen, 'Conversa')} />
                       <Stack.Screen name="GrupoInfo" component={T(GrupoInfoScreen, 'GrupoInfo')} />
                       <Stack.Screen name="Temas" component={T(TemasScreen, 'Temas')} />
                       <Stack.Screen name="Atividade" component={T(AtividadeScreen, 'Atividade')} />
                       <Stack.Screen name="StoryEditor" component={T(StoryEditorScreen, 'StoryEditor')} />
                       <Stack.Screen name="PerfilUsuario" component={T(PerfilUsuarioScreen, 'PerfilUsuario')} />
                       <Stack.Screen name="Comentarios" component={T(ComentariosScreen, 'Comentarios')} />
                       <Stack.Screen name="Live" component={T(LiveScreen, 'Live')} />
                       <Stack.Screen name="PostVideo" component={T(PostVideoScreen, 'PostVideo')} />
                       <Stack.Screen name="EditProfile" component={T(EditProfileScreen, 'EditProfile')} />
                       <Stack.Screen name="Hashtag" component={T(HashtagScreen, 'Hashtag')} />
                       <Stack.Screen name="Saved" component={T(SavedScreen, 'Saved')} />
                       <Stack.Screen name="Notifications" component={T(NotificationsScreen, 'Notifications')} />
                       <Stack.Screen name="Analytics" component={T(AnalyticsScreen, 'Analytics')} />
                       <Stack.Screen name="Monetizacao" component={T(MonetizacaoScreen, 'Monetizacao')} />
                       <Stack.Screen name="Settings" component={T(SettingsScreen, 'Settings')} />
                       <Stack.Screen name="Video" component={T(VideoScreen, 'Video')} />
                       <Stack.Screen name="StoryViewer" component={T(StoryViewerScreen, 'StoryViewer')} />
                       <Stack.Screen name="CriarGrupo" component={T(CriarGrupoScreen, 'CriarGrupo')} />
                       <Stack.Screen name="FollowList" component={T(FollowListScreen, 'FollowList')} />
                       <Stack.Screen name="Call" component={T(CallScreen, 'Call')} options={{ gestureEnabled: false }} />
</Stack.Navigator>
  </NavigationContainer>
  );
}
