import { spacing } from '@widoo/tokens';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  activeFilterCount,
  canSearchZone,
  focusedRoute,
  selectedRoute,
} from '../../../src/discovery/store';
import { useBackClosesSelection } from '../../../src/discovery/useBackClosesSelection';
import { useDiscovery, useRouteSearch } from '../../../src/discovery/useRouteSearch';
import { FiltersPanel } from '../../../src/filters/FiltersPanel';
import { QuickChips } from '../../../src/filters/QuickChips';
import { SearchPill } from '../../../src/filters/SearchPill';
import { useReleaseSplash } from '../../../src/launch/splash';
import { useUserLocation } from '../../../src/location/useUserLocation';
import { parisCenter } from '../../../src/map/geo';
import { SearchingPill, SearchZoneButton } from '../../../src/map/MapControls';
import { RouteMap } from '../../../src/map/RouteMap';
import { CoveredBySheet } from '../../../src/results/CoveredBySheet';
import { DiscoverySheet } from '../../../src/results/DiscoverySheet';
import { openRoute, openSection } from '../../../src/results/navigation';
import type { SheetLevel } from '../../../src/results/sheet';
import { ModalSheetShield } from '../../../src/ui/ModalSheetShield';

/**
 * E-01: the map of the zone shown, around the user or around Paris without position, searched
 * again on « Rechercher dans cette zone », and the results sheet of E-04 over it. Over the map,
 * the search pill with the filters button and the row of quick chips; the filters panel (E-03)
 * rises over everything.
 */
export default function HomeScreen() {
  const { location, enable } = useUserLocation();
  // The home is ready once its map shows, at its centre (E-18: the launch screen until then).
  useReleaseSplash(location.status !== 'pending');
  const search = useRouteSearch();
  const { routes, clusters, status, isEmpty, isOnline } = search;
  const [height, setHeight] = useState(0);
  const [topBarHeight, setTopBarHeight] = useState(0);
  const [sheetCover, setSheetCover] = useState<number | undefined>(undefined);
  const [sheetLevel, setSheetLevel] = useState<SheetLevel>('rest');
  const route = useDiscovery(selectedRoute);
  const focused = useDiscovery(focusedRoute);
  const isSearchable = useDiscovery(canSearchZone);
  const framing = useDiscovery((state) => state.framing);
  const showView = useDiscovery((state) => state.showView);
  const searchZone = useDiscovery((state) => state.searchZone);
  const chosenZone = useDiscovery((state) => state.zone);
  const leaveZone = useDiscovery((state) => state.leaveZone);
  const select = useDiscovery((state) => state.select);
  const filterCount = useDiscovery((state) => activeFilterCount(state.filters));
  const openFilters = useDiscovery((state) => state.openFilters);
  const openSearch = useDiscovery((state) => state.openSearch);
  const insets = useSafeAreaInsets();
  useBackClosesSelection();

  if (location.status === 'pending') {
    // The permission dialog, or the last known position, is a moment away: the map waits for
    // its centre rather than jumping.
    return <View className="flex-1 bg-surface" />;
  }
  const position = location.status === 'granted' ? location.position : null;
  const isOffline = !isOnline || status === 'offline';
  return (
    <>
      <ModalSheetShield className="flex-1">
        <View
          className="flex-1 bg-surface"
          onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
        >
          {/* Under the sheet at full, out of reach of screen readers (E-04). */}
          <CoveredBySheet level={sheetLevel}>
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
              topInset={topBarHeight}
              onSelect={(next) => select(next?.id ?? null)}
              onOpenRoute={(next, step) => openRoute(next, 'marker', step)}
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
              // Recentring searches around the user again, leaving a zone chosen in the search.
              onRecenter={leaveZone}
            />
            {/* Over the map; the sheet covers them when it rises to full (E-04). */}
            <View
              pointerEvents="box-none"
              className="absolute w-full gap-8"
              style={{ paddingTop: insets.top + spacing['space-8'] }}
              // Its height as laid out, larger text included: the map frames a route under it.
              onLayout={({ nativeEvent: { layout } }) => setTopBarHeight(layout.y + layout.height)}
            >
              <View className="px-16">
                <SearchPill
                  filterCount={filterCount}
                  onOpenFilters={openFilters}
                  onOpenSearch={openSearch}
                  zoneName={chosenZone?.name ?? null}
                  onLeaveZone={leaveZone}
                />
              </View>
              <QuickChips />
            </View>
          </CoveredBySheet>
          {height > 0 && (
            <DiscoverySheet
              containerHeight={height}
              position={position}
              onEnableLocation={location.status === 'denied' ? () => void enable() : null}
              search={search}
              onOpenRoute={openRoute}
              onOpenSection={openSection}
              onCoverChange={(cover, level) => {
                setSheetCover(cover);
                setSheetLevel(level);
              }}
            />
          )}
        </View>
      </ModalSheetShield>
      <FiltersPanel />
    </>
  );
}
