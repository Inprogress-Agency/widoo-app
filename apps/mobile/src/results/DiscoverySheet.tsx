import type { AnalyticsEvents, LatLng, RouteCard, RouteCluster } from '@widoo/shared';
import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { analytics } from '../analytics';
import { StatusMessage } from '../components/StatusMessage';
import { NoRoutesMessage, ZoomInMessage } from '../components/ZoneMessage';
import {
  activeFilterCount,
  resultsCount,
  selectedRoute,
  type SearchStatus,
} from '../discovery/store';
import { useDiscovery } from '../discovery/useRouteSearch';
import { formatDayAndTime } from '../format/date';
import { Button } from '../ui/Button';
import { ResultsSheet, type ResultsSheetMethods } from './ResultsSheet';
import { RouteCarousel, SkeletonCarousel } from './RouteCarousel';
import { RouteSummary, RouteSummaryMore } from './RouteSummary';
import type { SheetLevel } from './sheet';
import { SheetBanner } from './SheetBanner';
import { SheetHeader } from './SheetHeader';
import { zoneName } from './zone';

export type OpenSource = AnalyticsEvents['route_opened']['source'];

interface DiscoverySheetProps {
  /** Height of the home screen, above the tab bar. */
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
  /** The detent reached, and the height the sheet covers at the foot of the map. */
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
  search,
  onOpenRoute,
  onCoverChange,
}: DiscoverySheetProps) {
  const { t } = useTranslation();
  const sheet = useRef<ResultsSheetMethods>(null);
  const results = useDiscovery((state) => state.results);
  const resultsAt = useDiscovery((state) => state.resultsAt);
  const filterCount = useDiscovery((state) => activeFilterCount(state.filters));
  const widenZone = useDiscovery((state) => state.widenZone);
  const clearFilters = useDiscovery((state) => state.clearFilters);
  const focus = useDiscovery((state) => state.focus);
  const selected = useDiscovery(selectedRoute);
  const level = useRef<SheetLevel>('rest');
  /** Cards already reported as seen, for the results on screen: once each. */
  const seen = useRef(new Set<string>());

  useEffect(() => {
    seen.current = new Set();
  }, [results]);

  // A marker selected on the map brings the sheet back to rest, with the summary (E-04).
  useEffect(() => {
    if (selected) {
      sheet.current?.moveTo('rest');
    }
  }, [selected]);
  const { status, isOnline, isEmpty, clusters, retry } = search;
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
  if (selected) {
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
    const count = t('sheet.count', { count: routes.length });
    const zone = position ? zoneName(routes, position) : t('sheet.paris');
    peek = (
      <SheetHeader
        title={t('sheet.nearby')}
        subtitle={zone ? t('sheet.inZone', { count, zone }) : count}
      />
    );
    content = (
      <RouteCarousel
        routes={routes}
        position={position}
        onOpen={(route) => onOpenRoute(route, 'card')}
        onFocus={(route) => focus(route.id)}
        onVisible={(visible) => {
          for (const { route, index } of visible) {
            if (!seen.current.has(route.id)) {
              seen.current.add(route.id);
              analytics.track('result_card_viewed', {
                route_id: route.id,
                position: index,
                sheet_level: level.current,
              });
            }
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
      peek={
        <>
          {banner}
          {peek}
        </>
      }
    >
      {content}
    </ResultsSheet>
  );
}
