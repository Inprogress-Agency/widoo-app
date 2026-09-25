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

async function readLocation(shouldAsk: boolean): Promise<UserLocation> {
  let permission = await Location.getForegroundPermissionsAsync();
  if (permission.status === Location.PermissionStatus.UNDETERMINED && shouldAsk) {
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
 * Position of the user, asked once « when the app is in use » at the first opening, and read
 * again when the app comes back from the system settings. It stays on the device: the app only
 * uses it to centre the map.
 */
export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation>({ status: 'pending' });

  useEffect(() => {
    let isMounted = true;
    const update = (shouldAsk: boolean) =>
      readLocation(shouldAsk).then((next) => {
        if (isMounted) {
          setLocation(next);
        }
      });
    void update(true);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void update(false);
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
    setLocation(await readLocation(false));
  }, [location]);

  return { location, enable };
}
