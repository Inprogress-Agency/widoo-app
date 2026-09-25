import { useState } from 'react';
import { View } from 'react-native';
import { canSearchZone, focusedRoute, selectedRoute } from '../../../src/discovery/store';
import { useDiscovery, useRouteSearch } from '../../../src/discovery/useRouteSearch';
import { useUserLocation } from '../../../src/location/useUserLocation';
import { parisCenter } from '../../../src/map/geo';
import { SearchingPill, SearchZoneButton } from '../../../src/map/MapControls';
import { RouteMap } from '../../../src/map/RouteMap';
import { DiscoverySheet } from '../../../src/results/DiscoverySheet';
import { openRoute, openSection } from '../../../src/results/navigation';

/**
 * E-01: the map of the zone shown, around the user or around Paris without position, searched
 * again on « Rechercher dans cette zone », and the results sheet of E-04 over it. The search bar
 * and the chips come with #29.
 */
export default function HomeScreen() {
  const { location, enable } = useUserLocation();
  const search = useRouteSearch();
  const { routes, clusters, status, isEmpty, isOnline } = search;
  const [height, setHeight] = useState(0);
  const [sheetCover, setSheetCover] = useState<number | undefined>(undefined);
  const route = useDiscovery(selectedRoute);
  const focused = useDiscovery(focusedRoute);
  const isSearchable = useDiscovery(canSearchZone);
  const framing = useDiscovery((state) => state.framing);
  const showView = useDiscovery((state) => state.showView);
  const searchZone = useDiscovery((state) => state.searchZone);
  const select = useDiscovery((state) => state.select);

  if (location.status === 'pending') {
    // The permission dialog, or the last known position, is a moment away: the map waits for
    // its centre rather than jumping.
    return <View className="flex-1 bg-surface" />;
  }
  const position = location.status === 'granted' ? location.position : null;
  const isOffline = !isOnline || status === 'offline';
  return (
    <View
      className="flex-1 bg-surface"
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
    >
      <RouteMap
        routes={routes}
        clusters={clusters}
        center={position ?? parisCenter}
        hasPosition={position !== null}
        onViewChange={showView}
        framing={framing}
        selectedRoute={route}
        focusedRoute={focused}
        bottomInset={sheetCover}
        // No account in the app until E-10: nobody is Premium yet.
        hasPremium={false}
        onSelect={(next) => select(next?.id ?? null)}
        onOpenRoute={(next) => openRoute(next, 'marker')}
        searchControl={
          isSearchable ? (
            <SearchZoneButton onPress={() => searchZone('button')} />
          ) : (
            <SearchingPill isSearching={status === 'loading' && route === null} />
          )
        }
        // Over an empty zone, the message offers to widen it; offline, nothing can be searched:
        // no recentre (Ecrans › E-01).
        hasRecenter={!isEmpty && !isOffline}
      />
      {height > 0 && (
        <DiscoverySheet
          containerHeight={height}
          position={position}
          onEnableLocation={location.status === 'denied' ? () => void enable() : null}
          search={search}
          onOpenRoute={openRoute}
          onOpenSection={openSection}
          onCoverChange={setSheetCover}
        />
      )}
    </View>
  );
}
