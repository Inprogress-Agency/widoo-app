import type { LatLng } from '@widoo/shared';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

/** A new position under this move is not worth a render. */
const DISTANCE_INTERVAL_M = 10;

/**
 * The position while E-07 is open, for « à 900 m de vous » and the pill « Vous semblez être sur
 * place »: only with the permission already granted, never asked here, never in the background,
 * never sent (Ecrans › E-07, arrivée; Securite-et-RGPD). Null without it.
 */
export function useGoPosition(): LatLng | null {
  const [position, setPosition] = useState<LatLng | null>(null);
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let isMounted = true;
    void (async () => {
      const permission = await Location.getForegroundPermissionsAsync().catch(() => null);
      if (!isMounted || permission?.status !== Location.PermissionStatus.GRANTED) {
        return;
      }
      const watch = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: DISTANCE_INTERVAL_M },
        ({ coords }) => setPosition({ lat: coords.latitude, lng: coords.longitude }),
      ).catch(() => null);
      if (isMounted) {
        subscription = watch;
      } else {
        watch?.remove();
      }
    })();
    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, []);
  return position;
}
