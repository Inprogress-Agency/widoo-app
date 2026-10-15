import { useEffect, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';

/**
 * Whether the phone lets Widoo show notifications: `off` when its settings refuse them, `unknown`
 * when the app cannot tell (iOS until the push module of #44, Android before 13, where no
 * permission exists and they are on unless cut in the settings).
 */
export type PhoneNotifications = 'on' | 'off' | 'unknown';

/** First Android version with the notification permission (API 33). */
const ANDROID_NOTIFICATION_PERMISSION_API = 33;

export async function readPhoneNotifications(): Promise<PhoneNotifications> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < ANDROID_NOTIFICATION_PERMISSION_API) {
    return 'unknown';
  }
  const isGranted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );
  return isGranted ? 'on' : 'off';
}

/**
 * The state of the phone's notifications, read again at each return to the app: back from the
 * phone's settings, the box of Réglages › Notifications goes away by itself (D-061).
 */
export function usePhoneNotifications(): PhoneNotifications {
  const [state, setState] = useState<PhoneNotifications>('unknown');
  useEffect(() => {
    let isMounted = true;
    const read = () => {
      void readPhoneNotifications().then((next) => {
        if (isMounted) {
          setState(next);
        }
      });
    };
    read();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        read();
      }
    });
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);
  return state;
}
