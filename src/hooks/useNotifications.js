import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_BASE } from '../constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications() {
  useEffect(() => {
    register();
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (url) Linking.openURL(url);
    });
    return () => sub.remove();
  }, []);
}

// Exportados pro toggle das Configurações
export async function registerPush() {
  await SecureStore.deleteItemAsync('bt_push_off').catch(() => {});
  return register(true);
}

export async function unregisterPush() {
  await SecureStore.setItemAsync('bt_push_off', '1').catch(() => {});
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    const tokenResp = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined).catch(() => null);
    const expoPushToken = tokenResp?.data;
    const userToken = await SecureStore.getItemAsync('bt_token');
    if (!expoPushToken || !userToken) return true;
    await fetch(`${API_BASE}/push-register`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: userToken, expo_push_token: expoPushToken }),
    });
  } catch {}
  return true;
}

export async function isPushEnabled() {
  const off = await SecureStore.getItemAsync('bt_push_off').catch(() => null);
  if (off === '1') return false;
  const { status } = await Notifications.getPermissionsAsync().catch(() => ({ status: 'undetermined' }));
  return status === 'granted';
}

async function register(force = false) {
  try {
    // Preferência do usuário (toggle nas Configurações)
    if (!force) {
      const off = await SecureStore.getItemAsync('bt_push_off').catch(() => null);
      if (off === '1') return;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return false;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'BlueTube',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1a6bff',
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const expoPushToken = tokenResp?.data;
    if (!expoPushToken) return;

    const userToken = await SecureStore.getItemAsync('bt_token');
    if (!userToken) return;

    await fetch(`${API_BASE}/push-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: userToken,
        expo_push_token: expoPushToken,
        platform: Platform.OS,
      }),
    });
    return true;
  } catch { return false; }
}
