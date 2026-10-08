import { FlashList, type FlashListRef, type ViewToken } from '@shopify/flash-list';
import type { LatLng, RouteCard as RouteCardData, RouteSort } from '@widoo/shared';
import { spacing } from '@widoo/tokens';
import { BottomTabBarHeightContext } from 'expo-router/tabs';
import { use, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analytics } from '../analytics';
import { createCardViewTracker, listSortedEvent } from '../analytics/discovery';
import { listSorts, zoneRadiusM, type SectionId } from '../discovery/sections';
import { useDiscovery } from '../discovery/useRouteSearch';
import { useSectionList, useZoneCount } from '../discovery/useSectionList';
import { formatDayAndTime } from '../format/date';
import { formatDistance } from '../format/distance';
import { ModalSheetShield } from '../ui/ModalSheetShield';
import { SortPill } from '../ui/SortPill';
import { SortSheet, type SortSheetMethods } from '../ui/SortSheet';
import { Text } from '../ui/Text';
import { RouteCard } from './RouteCard';
import { ListFooter, ListHeader, ListMessage, ListSkeletons } from './SectionListParts';
import { zoneName } from './zone';

type Row =
  | { kind: 'header' }
  | { kind: 'bar' }
  | { kind: 'route'; route: RouteCardData }
  | { kind: 'skeletons' }
  | { kind: 'message' };

/** The header scrolls away; the bar under it, count and sort, stays pinned (Ecrans › E-04). */
const BAR_INDEX = 1;
const headRows: Row[] = [{ kind: 'header' }, { kind: 'bar' }];

/** A card counts as seen once half of it is on screen, as in the carousel. */
const viewabilityConfig = { itemVisiblePercentThreshold: 50 };

interface SectionListProps {
  section: SectionId;
  /** The user's position; null without it: no distance, and the zone is Paris. */
  position: LatLng | null;
  /** « Activez la localisation pour trier par distance ». */
  onEnableLocation: () => void;
  onBack: () => void;
  onOpenRoute: (route: RouteCardData) => void;
}

/**
 * « Voir tout » of a section (Ecrans › E-04): the title of the section and its zone, a pinned
 * bar with the count and the sort pill, and the cards of the whole zone in a vertical FlashList,
 * page after page as it scrolls (M-09). Loading, empty, failed and offline, it keeps its header
 * and its bar. It runs under the floating tab bar, and its end scrolls clear of it.
 */
export function SectionList({
  section,
  position,
  onEnableLocation,
  onBack,
  onOpenRoute,
}: SectionListProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = use(BottomTabBarHeightContext) ?? 0;
  const list = useRef<FlashListRef<Row>>(null);
  const sortSheet = useRef<SortSheetMethods>(null);
  const { routes, sort, status, isLoadingMore, hasFailedMore, loadMore, retry, fetchedAt } =
    useSectionList(position);
  const zoneCount = useZoneCount();
  const results = useDiscovery((state) => state.results);
  const search = useDiscovery((state) => state.search);
  const setSort = useDiscovery((state) => state.setSort);
  const resultsAt = useDiscovery((state) => state.resultsAt);
  /** The results shown: the zone, its answer and the sort. */
  const shownResults = `${search?.id}:${resultsAt}:${sort}`;
  const reportCardViews = useCardViews(section, shownResults, sort);

  const zone = position && results ? zoneName(results.items, position) : null;
  const radius = search && formatDistance(t, zoneRadiusM(search.view.bbox), 'short');
  const subtitle = !position
    ? t('list.aroundParis')
    : [
        zone ? t('list.around', { zone }) : t('list.aroundYou'),
        radius && t('list.radius', { radius }),
      ]
        .filter(Boolean)
        .join(' · ');

  const countText = {
    loading: t('list.searching'),
    error: '—',
    offline: '—',
    empty: t('sheet.count', { count: 0 }),
    ready: t('sheet.count', { count: zoneCount ?? routes.length }),
  }[status];
  const sortLabel = t(`sort.${sort}.label`);

  const content: Row[] =
    status === 'ready'
      ? routes.map((route) => ({ kind: 'route', route }))
      : [{ kind: status === 'loading' ? 'skeletons' : 'message' }];

  const renderItem = ({ item }: { item: Row }) => {
    switch (item.kind) {
      case 'header':
        return (
          <ListHeader
            title={t(`sections.${section}`)}
            subtitle={subtitle}
            offlineSince={fetchedAt === null ? null : formatDayAndTime(fetchedAt)}
            onBack={onBack}
          />
        );
      case 'bar':
        return (
          <View className="flex-row items-center justify-between gap-12 border-b border-line bg-bg px-16 py-12">
            <Text
              variant="item"
              accessibilityLiveRegion="polite"
              accessibilityElementsHidden={countText === '—'}
              className="shrink"
            >
              {countText}
            </Text>
            <SortPill
              label={sortLabel}
              accessibilityLabel={t('sort.pill', { sort: sortLabel })}
              onPress={() => sortSheet.current?.open()}
            />
          </View>
        );
      case 'route':
        return (
          <View className="px-16 pt-12">
            <RouteCard
              route={item.route}
              position={position}
              variant="list"
              onPress={() => onOpenRoute(item.route)}
            />
          </View>
        );
      case 'skeletons':
        return <ListSkeletons label={t('list.searching')} />;
      case 'message':
        return <ListMessage status={status} onRetry={retry} />;
    }
  };

  return (
    // Safe area measured at runtime: the pinned bar stays under the status bar.
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <ModalSheetShield className="flex-1">
        <FlashList
          // FlashList tells viewability by index: other results are a list of their own, so that
          // the cards on the indices of the previous ones are reported as seen.
          key={shownResults}
          ref={list}
          data={[...headRows, ...content]}
          keyExtractor={(row) => (row.kind === 'route' ? row.route.id : row.kind)}
          getItemType={(row) => row.kind}
          renderItem={renderItem}
          stickyHeaderIndices={[BAR_INDEX]}
          onEndReached={status === 'ready' ? loadMore : undefined}
          onEndReachedThreshold={0.5}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={reportCardViews}
          // Tab bar height measured at runtime: the last card and the foot end above the bar.
          contentContainerStyle={{ paddingBottom: tabBarHeight + spacing['space-16'] }}
          ListFooterComponent={
            status === 'ready' ? (
              <ListFooter isLoading={isLoadingMore} hasFailed={hasFailedMore} onRetry={retry} />
            ) : null
          }
        />
      </ModalSheetShield>
      <SortSheet
        ref={sortSheet}
        title={t('sort.title')}
        closeLabel={t('sort.close')}
        value={sort}
        options={listSorts.map((value) => ({
          value,
          label: t(`sort.${value}.label`),
          description: t(`sort.${value}.description`),
          unavailable:
            value === 'distance' && !position
              ? { label: t('sort.enableLocation'), onPress: onEnableLocation }
              : undefined,
        }))}
        onChange={(next) => {
          const event = listSortedEvent(section, sort, next);
          if (event) {
            analytics.track('list_sorted', event);
          }
          setSort(next);
          list.current?.scrollToOffset({ offset: 0, animated: false });
        }}
      />
    </View>
  );
}

/**
 * `result_card_viewed` for the cards of the list (wiki Analytics › Découverte): `sheet_level` is
 * `list`, `sort` the sort shown, `position` from 0 among the routes. Each card once per results
 * shown, which `results` names: the zone, its answer and the sort.
 */
function useCardViews(section: SectionId, results: string, sort: RouteSort) {
  const tracker = useRef(createCardViewTracker());
  // FlashList reads its viewability callback once: the latest values are read through a ref.
  const latest = useRef({ section, results, sort });
  useEffect(() => {
    latest.current = { section, results, sort };
  }, [section, results, sort]);
  return useCallback(({ viewableItems }: { viewableItems: ViewToken<Row>[] }) => {
    const visible = viewableItems.flatMap(({ item, index }) =>
      item?.kind === 'route' && index !== null
        ? [{ route: item.route, index: index - headRows.length }]
        : [],
    );
    const { section: key, results: shown, sort: shownSort } = latest.current;
    const context = { section: key, sheet_level: 'list', sort: shownSort } as const;
    for (const view of tracker.current(shown, visible, context)) {
      analytics.track('result_card_viewed', view);
    }
  }, []);
}
