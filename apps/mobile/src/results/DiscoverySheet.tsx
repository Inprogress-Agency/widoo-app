import type { AnalyticsEvents, LatLng, RouteCard, RouteCluster } from '@widoo/shared';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StatusMessage } from '../components/StatusMessage';
import { NoRoutesMessage, ZoomInMessage } from '../components/ZoneMessage';
import { activeFilterCount, resultsCount, type SearchStatus } from '../discovery/store';
import { useDiscovery } from '../discovery/useRouteSearch';
import { formatDayAndTime } from '../format/date';
import { Button } from '../ui/Button';
import { ResultsSheet } from './ResultsSheet';
import { RouteCarousel, SkeletonCarousel } from './RouteCarousel';
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
  const results = useDiscovery((state) => state.results);
  const resultsAt = useDiscovery((state) => state.resultsAt);
  const filterCount = useDiscovery((state) => activeFilterCount(state.filters));
  const widenZone = useDiscovery((state) => state.widenZone);
  const clearFilters = useDiscovery((state) => state.clearFilters);
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
  if (status === 'error' || (status === 'offline' && !results)) {
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
      />
    );
  }

  return (
    <ResultsSheet
      containerHeight={containerHeight}
      onLevelChange={(_, height) => onCoverChange?.(height)}
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
