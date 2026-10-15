import type { LatLng } from '@widoo/shared';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

export type UserLocation =
  | { status: 'pending' }
  /** Null position: permission granted, but the device could not tell where it is. */
  | { status: 'granted'; position: LatLng | null }
  /** `canAskAgain` false: only the system settings can grant it now. */
  | { status: 'denied'; canAskAgain: boolean };

/** A last known position younger than this centres the map without waiting for a fix. */
const lastKnownMaxAgeMs = 5 * 60_000;
/** Without a recent position, the map waits this long for a fix, then opens on Paris. */
const fixTimeoutMs = 3_000;

/** The current position, or null when the device cannot tell in time (no fix, no provider). */
function currentPosition(): Promise<Location.LocationObject | null> {
  return Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), fixTimeoutMs)),
  ]);
}

/**
 * The position, after asking for it when `onAsk` is given and the system never asked yet:
 * `onAsk` is called just before the system dialog shows.
 */
async function readLocation(onAsk?: () => void): Promise<UserLocation> {
  let permission = await Location.getForegroundPermissionsAsync();
  if (permission.status === Location.PermissionStatus.UNDETERMINED && onAsk) {
    onAsk();
    permission = await Location.requestForegroundPermissionsAsync();
  }
  if (permission.status !== Location.PermissionStatus.GRANTED) {
    return { status: 'denied', canAskAgain: permission.canAskAgain };
  }
  const fix =
    (await Location.getLastKnownPositionAsync({ maxAge: lastKnownMaxAgeMs })) ??
    (await currentPosition());
  return {
    status: 'granted',
    position: fix ? { lat: fix.coords.latitude, lng: fix.coords.longitude } : null,
  };
}

/**
 * Position of the user, asked once « when the app is in use » at the first display of the map,
 * and read again when the app comes back from the system settings. It stays on the device: the
 * app only uses it to centre the map. `isAsking` from the moment the system dialog shows: the
 * launch screen goes away under it, the dialog shows over the loading home (Ecrans › E-18).
 */
export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation>({ status: 'pending' });
  const [isAsking, setIsAsking] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const update = (onAsk?: () => void) =>
      readLocation(onAsk).then((next) => {
        if (isMounted) {
          setLocation(next);
        }
      });
    void update(() => setIsAsking(true));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void update();
      }
    });
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  /** « Activer »: the system request while it can still be shown, the settings afterwards. */
  const enable = useCallback(async () => {
    if (location.status === 'denied' && !location.canAskAgain) {
      await Linking.openSettings();
      return;
    }
    await Location.requestForegroundPermissionsAsync();
    setLocation(await readLocation());
  }, [location]);

  return { location, isAsking, enable };
}
