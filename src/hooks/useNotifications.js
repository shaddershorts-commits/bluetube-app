import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

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

async function register() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'BlueTube',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1a6bff',
      });
    }
  } catch {}
}
