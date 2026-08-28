// ─────────────────────────────────────────────────────────────
// Push notification registration (Parent app).
//
// WHY THIS FILE EXISTS: PARENT_APP_SPEC.md §7 lists it as reusable from
// Hfz-Pro, but the Teacher app ships no push client at all — `expo-notifications`
// is absent from its package.json (plan gap G2). Written from scratch here.
//
// Flow (docs/DB_AND_NOTIFICATIONS.md §3):
//   teacher saves entry → DB trigger → `notifications` row → Database Webhook
//   → `push` Edge Function → Expo Push API → FCM/APNs → this device.
//
// This module only does the device half: permission, Expo push token, upsert
// into `device_tokens`, and in-app delivery while the app is foregrounded.
// ─────────────────────────────────────────────────────────────
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { DataSource } from '@/data/datasource';
import { HAS_SUPABASE } from '@/data/supabaseConfig';

let configured = false;

/** Show an alert/banner/sound when a push arrives while the app is open. */
export function configureForegroundHandler() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function requestPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return !!asked.granted;
}

/**
 * Get this device's Expo push token and register it against the signed-in
 * parent. Returns null when Expo Go / a bare dev client cannot mint a token
 * (no `expo.pushToken` in the manifest) or when running offline on mock data.
 */
export async function registerForPush(): Promise<string | null> {
  if (!HAS_SUPABASE) return null; // no backend to store the token against
  configureForegroundHandler();

  const granted = await requestPermission();
  if (!granted) return null;

  // Android needs a notification channel or high-priority pushes are dropped.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Madrasa updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1E5FE0',
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const tokenRes = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();
  const token = tokenRes.data;
  if (!token) return null;

  await DataSource.registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
  return token;
}

/** Listen for taps so a push can deep-link (data.url → /mushaf?studentId=…). */
export function addResponseListener(handler: (url?: string) => void) {
  return Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as
      | { url?: string; student_id?: string }
      | undefined;
    handler(data?.url);
  });
}

/** Local test notification — used by the Settings screen's "Send test" row. */
export async function scheduleTestNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: null,
  });
}
