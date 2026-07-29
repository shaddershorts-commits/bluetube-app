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

// FIX 2026-07-29 (push nunca chegava): este hook é quem registra o aparelho no
// Expo e manda o token pro backend — e ele NÃO ERA CHAMADO EM LUGAR NENHUM.
// Só o toggle de Configurações importava register/unregister. Resultado: a
// tabela `user_push_tokens` estava VAZIA no app inteiro, então
// `sendPushToUser` sempre saía com `sent: 0` e nenhuma notificação nativa foi
// entregue desde o lançamento. Agora o App.js monta o hook.
//
// Recebe o token do usuário: só registra DEPOIS do login (visitante não leva
// pedido de permissão na cara) e re-registra quando alguém entra na conta.
export function useNotifications(userToken) {
  useEffect(() => {
    if (userToken) register();
  }, [userToken]);

  useEffect(() => {
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
    // Sem login não há pra quem associar o token — checa ANTES de pedir
    // permissão, senão o visitante levava o pop-up do sistema à toa e o
    // registro morria logo depois por falta de token.
    const jaLogado = await SecureStore.getItemAsync('bt_token');
    if (!jaLogado) return false;

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
