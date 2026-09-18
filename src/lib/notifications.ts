import Constants from 'expo-constants';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';

import { db } from './firebase';

// Importing expo-notifications throws at module load inside Expo Go (SDK 53+
// removed remote push there). We never statically import it; it is required
// lazily from code paths that only run in real builds.
function loadNotifications(): typeof import('expo-notifications') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications');
}

export function isExpoGo(): boolean {
  return Constants.executionEnvironment === 'storeClient';
}

export function isWeb(): boolean {
  return Platform.OS === 'web';
}

export function configureNotificationHandler() {
  if (isExpoGo() || isWeb()) return; // no-op inside Expo Go or on web
  const N = loadNotifications();
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

let channelReady = false;

async function ensureAndroidChannel(N: typeof import('expo-notifications')) {
  if (Platform.OS !== 'android' || channelReady) return;
  await N.setNotificationChannelAsync('default', {
    name: 'General',
    importance: N.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6B21A8',
  });
  channelReady = true;
}

export async function registerForPushNotificationsAsync(uid: string): Promise<void> {
  if (isExpoGo() || isWeb()) return; // remote push is unavailable in Expo Go (SDK 53+) and on web
  try {
    const N = loadNotifications();
    await ensureAndroidChannel(N);

    const { status: existing } = await N.getPermissionsAsync();
    let granted = existing === 'granted';
    if (!granted) {
      const { status } = await N.requestPermissionsAsync();
      granted = status === 'granted';
    }
    if (!granted) return;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) return;

    const token = (await N.getExpoPushTokenAsync({ projectId })).data;
    await updateDoc(doc(db, 'users', uid), { pushToken: token });
  } catch {
    // silent — can fail if offline or not a native build
  }
}

export function NotificationTap() {
  const router = useRouter();

  useEffect(() => {
    if (isExpoGo() || isWeb()) return;
    const N = loadNotifications();

    function redirect(url: string) {
      router.push(url as Href);
    }

    N.getLastNotificationResponseAsync()
      .then((response) => {
        const data = response?.notification.request.content.data;
        if (data && typeof data.url === 'string') {
          redirect(data.url);
        }
      })
      .catch(() => {});

    const sub = N.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (url && typeof url === 'string') {
        redirect(url);
      }
    });
    return () => sub.remove();
  }, [router]);

  return null;
}