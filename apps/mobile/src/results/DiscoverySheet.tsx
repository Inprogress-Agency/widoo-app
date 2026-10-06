import type { LatLng, RouteCard, RouteCluster } from '@widoo/shared';
import { size } from '@widoo/tokens';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Keyboard, Pressable, View, useWindowDimensions } from 'react-native';
import { analytics } from '../analytics';
import { createCardViewTracker } from '../analytics/discovery';
import { StatusMessage } from '../components/StatusMessage';
import { NoRoutesMessage, ZoomInMessage } from '../components/ZoneMessage';
import {
  activeFilterCount,
  resultsCount,
  selectedRoute,
  type SearchStatus,
} from '../discovery/store';
import type { SectionId } from '../discovery/sections';
import { discoveryStore, useDiscovery } from '../discovery/useRouteSearch';
import { useZoneCount } from '../discovery/useSectionList';
import { formatDayAndTime } from '../format/date';
import { zoomForBbox } from '../map/geo';
import type { RecentZone } from '../search/recentZones';
import { SearchField } from '../search/SearchField';
import { SearchPanel } from '../search/SearchPanel';
import { resultCounts } from '../search/textSearch';
import { recentZones, useRecentZones } from '../search/useRecentZones';
import { useTextSearch } from '../search/useTextSearch';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import type { OpenSource } from './navigation';
import { ResultsSheet, type ResultsSheetMethods } from './ResultsSheet';
import { RouteCarousel, SkeletonCarousel } from './RouteCarousel';
import { RouteSummary, RouteSummaryMore } from './RouteSummary';
import type { SheetLevel } from './sheet';
import { SheetBanner } from './SheetBanner';
import { SheetHeader } from './SheetHeader';
import { zoneName } from './zone';

interface DiscoverySheetProps {
  /** Height of the home screen, edge to edge behind the floating tab bar. */
  containerHeight: number;
  /** The user's position; null without it: no distance, and the zone is Paris. */
  position: LatLng | null;
  /** The position is refused: « Position désactivée · autour de Paris » and « Activer ». */
  onEnableLocation: (() => void) | null;
  search: {
    status: SearchStatus;
    isOnline: boolean;
    isEmpty: boolean;
    clusters: readonly RouteCluster[] | null;
    retry: () => void;
  };
  onOpenRoute: (route: RouteCard, source: OpenSource) => void;
  /** « Voir tout » of a section. */
  onOpenSection: (section: SectionId) => void;
  /** The detent reached, and the height the sheet covers at the foot of the map, bar included. */
  onCoverChange?: (height: number) => void;
}

/**
 * The results sheet of the home screen (Ecrans › E-01, E-04): « À proximité » with the count and
 * the zone, and the carousel of cards; the messages of every state live in it, never on the map:
 * loading, no route, zone too large, error, offline, position off.
 */
export function DiscoverySheet({
  containerHeight,
  position,
  onEnableLocation,
  search: searchState,
  onOpenRoute,
  onOpenSection,
  onCoverChange,
}: DiscoverySheetProps) {
  const { t } = useTranslation();
  const sheet = useRef<ResultsSheetMethods>(null);
  const results = useDiscovery((state) => state.results);
  const resultsAt = useDiscovery((state) => state.resultsAt);
  const filterCount = useDiscovery((state) => activeFilterCount(state.filters));
  const chosenZone = useDiscovery((state) => state.zone);
  const widenZone = useDiscovery((state) => state.widenZone);
  const clearFilters = useDiscovery((state) => state.clearFilters);
  const focus = useDiscovery((state) => state.focus);
  const selected = useDiscovery(selectedRoute);
  const zoneCount = useZoneCount();
  const level = useRef<SheetLevel>('rest');
  const search = useSearchInSheet(sheet, level, onOpenRoute);
  /** Cards already reported as seen, for the results on screen: once each. */
  const cardViews = useRef(createCardViewTracker());

  // A marker selected on the map brings the sheet back to rest, with the summary (E-04).
  useEffect(() => {
    if (selected) {
      sheet.current?.moveTo('rest');
    }
  }, [selected]);
  const { status, isOnline, isEmpty, clusters, retry } = searchState;
  const isOffline = !isOnline || status === 'offline';
  const routes = results?.items ?? [];

  const banner =
    isOffline && results && resultsAt !== null ? (
      <SheetBanner icon="offline" text={t('sheet.offline', formatDayAndTime(resultsAt))} />
    ) : (
      onEnableLocation && (
        <SheetBanner
          icon="location-off"
          text={t('map.locationOff')}
          action={{
            label: t('map.enable'),
            accessibilityLabel: t('map.enableLocation'),
            onPress: onEnableLocation,
          }}
        />
      )
    );

  const message = (children: ReactNode) => <View className="px-24">{children}</View>;
  const retryButton = <Button label={t('sheet.retry')} onPress={retry} />;

  let peek: ReactNode;
  let content: ReactNode = null;
  if (search.isOpen) {
    peek = search.field;
    content = search.panel;
  } else if (selected) {
    peek = (
      <RouteSummary
        key={selected.id}
        route={selected}
        position={position}
        onOpen={() => onOpenRoute(selected, 'marker')}
      />
    );
    content = <RouteSummaryMore route={selected} position={position} />;
  } else if (status === 'error' || (status === 'offline' && !results)) {
    peek = message(
      <StatusMessage
        icon={isOffline ? 'offline' : 'error'}
        title={isOffline ? t('sheet.noConnection') : t('sheet.error')}
        body={t('sheet.errorBody')}
        action={retryButton}
      />,
    );
  } else if (!results) {
    peek = <SheetHeader title={t('sheet.nearby')} subtitle={t('sheet.searching')} />;
    content = <SkeletonCarousel label={t('sheet.searching')} />;
  } else if (isEmpty) {
    peek = message(
      <NoRoutesMessage
        filterCount={filterCount}
        onWiden={widenZone}
        onClearFilters={clearFilters}
      />,
    );
  } else if (clusters) {
    peek = message(<ZoomInMessage count={resultsCount(results)} />);
  } else {
    // Over one page of results, the count of the zone; the listed routes until it comes.
    const count = t('sheet.count', { count: zoneCount ?? routes.length });
    // A zone chosen in the search names the section: « Autour de Canal Saint-Martin » (E-01).
    const zone = chosenZone ? null : position ? zoneName(routes, position) : t('sheet.paris');
    // « 9 parcours · 3 filtres » once filters apply (Ecrans › E-01, filtres appliqués).
    const filters = t('sheet.filterCount', { count: filterCount });
    const subtitle =
      filterCount > 0
        ? t('sheet.filtered', { count, filters })
        : zone
          ? t('sheet.inZone', { count, zone })
          : count;
    peek = (
      <SheetHeader
        title={chosenZone ? t('sheet.aroundZone', { zone: chosenZone.name }) : t('sheet.nearby')}
        subtitle={subtitle}
        action={<SeeAllLink onPress={() => onOpenSection('nearby')} />}
      />
    );
    content = (
      <RouteCarousel
        routes={routes}
        position={position}
        onOpen={(route) => onOpenRoute(route, 'card')}
        onFocus={(route) => focus(route.id)}
        onVisible={(visible) => {
          // The results of the store, not of this render: the carousel may call an older handler.
          const current = discoveryStore.getState().results;
          for (const view of cardViews.current(current, visible, level.current)) {
            analytics.track('result_card_viewed', view);
          }
        }}
      />
    );
  }

  return (
    <ResultsSheet
      ref={sheet}
      containerHeight={containerHeight}
      onLevelChange={(next, height) => {
        level.current = next;
        onCoverChange?.(height);
      }}
      onUserDetent={search.onUserDetent}
      peek={
        <>
          {!search.isOpen && banner}
          {peek}
        </>
      }
    >
      {content}
    </ResultsSheet>
  );
}

// The link text is shorter than a finger: its hit slop brings it to 44 points.
const linkHitSlop = size['touch-min'] / 4;

/** « Voir tout » of a section header: blue on white, 4.51:1 (Direction-Artistique › Couleurs). */
function SeeAllLink({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={t('sheet.seeAll')}
      accessibilityHint={t('sheet.seeAllHint')}
      hitSlop={linkHitSlop}
      onPress={onPress}
    >
      <Text variant="button" color="blue">
        {t('sheet.seeAll')}
      </Text>
    </Pressable>
  );
}

/**
 * The search of E-02 in the sheet: opened from the pill, the sheet rises to full with the
 * keyboard, the field and its results in place of the sections; « Annuler », Android's back, or
 * the sheet dragged down closes it and the sheet goes back where it was. A zone chosen enters the
 * recent zones, and the sheet goes back to rest while the map frames it.
 */
function useSearchInSheet(
  sheet: RefObject<ResultsSheetMethods | null>,
  level: RefObject<SheetLevel>,
  onOpenRoute: (route: RouteCard, source: OpenSource) => void,
) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isOpen = useDiscovery((state) => state.isSearchOpen);
  const closeSearch = useDiscovery((state) => state.closeSearch);
  const chooseZone = useDiscovery((state) => state.chooseZone);
  const leaveZone = useDiscovery((state) => state.leaveZone);
  const recent = useRecentZones();
  const [text, setText] = useState('');
  const { input, view, retryZones, retryRoutes } = useTextSearch(isOpen ? text : '');
  /** Where the sheet was when the search opened. */
  const before = useRef<SheetLevel>('rest');

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    before.current = level.current;
    sheet.current?.moveTo('full');
  }, [isOpen, sheet, level]);

  const close = (to: SheetLevel) => {
    Keyboard.dismiss();
    setText('');
    closeSearch();
    sheet.current?.moveTo(to);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close(before.current);
      return true;
    });
    return () => subscription.remove();
  });

  const choose = (zone: RecentZone) => {
    recentZones.add(zone);
    close('rest');
    chooseZone(zone, zoomForBbox(zone.bbox, width));
  };
  const counts = resultCounts(input);
  return {
    isOpen,
    onUserDetent: (next: SheetLevel) => {
      // Dragged down by the user: the search closes where the sheet stops.
      if (isOpen && next !== 'full') {
        Keyboard.dismiss();
        setText('');
        closeSearch();
      }
    },
    field: (
      <SearchField
        value={text}
        onChangeText={setText}
        onCancel={() => close(before.current)}
        isLoading={view.kind !== 'offline' && 'isLoading' in view && view.isLoading}
        resultsAnnouncement={
          counts &&
          t('search.results', {
            zones: t('search.zoneCount', { count: counts.zones }),
            routes: t('sheet.count', { count: counts.routes }),
          })
        }
      />
    ),
    panel: (
      <SearchPanel
        text={input.text}
        view={view}
        input={input}
        recentZones={recent}
        onChooseZone={choose}
        onRemoveRecent={recentZones.remove}
        onClearRecent={recentZones.clear}
        onAroundMe={() => {
          close('rest');
          leaveZone();
        }}
        onOpenRoute={(route) => {
          Keyboard.dismiss();
          onOpenRoute(route, 'card');
        }}
        retryZones={retryZones}
        retryRoutes={retryRoutes}
      />
    ),
  };
}
