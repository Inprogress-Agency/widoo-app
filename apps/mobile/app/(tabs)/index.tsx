import { router } from 'expo-router';
import { View } from 'react-native';
import { NoRoutesMessage, ZoomInMessage } from '../../src/components/ZoneMessage';
import {
  activeFilterCount,
  canSearchZone,
  resultsCount,
  selectedRoute,
} from '../../src/discovery/store';
import { useDiscovery, useRouteSearch } from '../../src/discovery/useRouteSearch';
import { useUserLocation } from '../../src/location/useUserLocation';
import { parisCenter } from '../../src/map/geo';
import { LocationOffBanner, SearchingPill, SearchZoneButton } from '../../src/map/MapControls';
import { RouteMap } from '../../src/map/RouteMap';

/**
 * E-01, the map part: the routes of the zone shown, around the user or around Paris without
 * position, searched again on « Rechercher dans cette zone », and the selection of a route (E-04).
 * The search bar, the chips and the results sheet come with #28 and #29.
 */
export default function HomeScreen() {
  const { location, enable } = useUserLocation();
  const { routes, clusters, status, isEmpty } = useRouteSearch();
  const filterCount = useDiscovery((state) => activeFilterCount(state.filters));
  const results = useDiscovery((state) => state.results);
  const route = useDiscovery(selectedRoute);
  const isSearchable = useDiscovery(canSearchZone);
  const framing = useDiscovery((state) => state.framing);
  const showView = useDiscovery((state) => state.showView);
  const searchZone = useDiscovery((state) => state.searchZone);
  const select = useDiscovery((state) => state.select);
  const widenZone = useDiscovery((state) => state.widenZone);
  const clearFilters = useDiscovery((state) => state.clearFilters);

  if (location.status === 'pending') {
    // The permission dialog, or the last known position, is a moment away: the map waits for
    // its centre rather than jumping.
    return <View className="flex-1 bg-surface" />;
  }
  const position = location.status === 'granted' ? location.position : null;
  return (
    <View className="flex-1 bg-surface">
      <RouteMap
        routes={routes}
        clusters={clusters}
        center={position ?? parisCenter}
        hasPosition={position !== null}
        onViewChange={showView}
        framing={framing}
        selectedRoute={route}
        // No account in the app until E-10: nobody is Premium yet.
        hasPremium={false}
        onSelect={(next) => select(next?.id ?? null)}
        onOpenRoute={(next) => router.push({ pathname: '/route/[id]', params: { id: next.id } })}
        banner={
          location.status === 'denied' && <LocationOffBanner onEnable={() => void enable()} />
        }
        searchControl={
          isSearchable ? (
            <SearchZoneButton onPress={() => searchZone('button')} />
          ) : (
            <SearchingPill isSearching={status === 'loading' && route === null} />
          )
        }
        // Over an empty zone, the message offers to widen it: no recentre, and « Rechercher
        // dans cette zone » only once the user moves the map.
        hasRecenter={!isEmpty}
      />
      {clusters && results && !isEmpty && <ZoomInMessage count={resultsCount(results)} />}
      {isEmpty && (
        <NoRoutesMessage
          filterCount={filterCount}
          onWiden={widenZone}
          onClearFilters={clearFilters}
        />
      )}
    </View>
  );
}
