import type { RouteCard } from '@widoo/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { useRouteSearch } from '../../src/api/queries';
import { useUserLocation } from '../../src/location/useUserLocation';
import { parisCenter, type Bbox } from '../../src/map/geo';
import { LocationOffBanner } from '../../src/map/MapControls';
import { RouteMap } from '../../src/map/RouteMap';

const noRoutes: RouteCard[] = [];

/**
 * E-01, the map part: the routes around the user, or around Paris without position. The search
 * bar, the chips and the results sheet come with #27 and #28.
 */
export default function HomeScreen() {
  const { location, enable } = useUserLocation();
  const [zone, setZone] = useState<Bbox | null>(null);
  const { data } = useRouteSearch(zone);
  // Clusters (a zone too large to list) are drawn with « Rechercher dans cette zone » (#27).
  const routes = data?.items ?? noRoutes;

  if (location.status === 'pending') {
    // The permission dialog, or the last known position, is a moment away: the map waits for
    // its centre rather than jumping.
    return <View className="flex-1 bg-surface" />;
  }
  const position = location.status === 'granted' ? location.position : null;
  return (
    <RouteMap
      routes={routes}
      center={position ?? parisCenter}
      hasPosition={position !== null}
      onFirstZone={setZone}
      onRoutePress={() => undefined}
      banner={location.status === 'denied' && <LocationOffBanner onEnable={() => void enable()} />}
    />
  );
}
