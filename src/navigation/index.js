import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store';
import { COLORS } from '../constants';

import LoginScreen from '../screens/LoginScreen';
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
        tabBarStyle: { backgroundColor: COLORS.background, borderTopColor: COLORS.border, height: 60, paddingBottom: 6, paddingTop: 6 },
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

export default function Navigation() {
  const { token, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <Text style={styles.logo}>Blue<Text style={{ color: COLORS.neon }}>Tube</Text></Text>
        <ActivityIndicator color={COLORS.neon} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={NAV_THEME}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
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

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, gap: 20 },
  logo: { color: '#fff', fontSize: 36, fontWeight: '800' },
});
