import {
  taxonomies,
  type Mood,
  type ProfileRouteSort,
  type PublicProfile,
  type RouteCard as RouteCardData,
} from '@widoo/shared';
import { filterIcons } from '@widoo/tokens';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { taxonomyLabels } from '../i18n/labels';
import { RouteCard } from '../results/RouteCard';
import { Chip } from '../ui/Chip';
import { Icon, uiIcon } from '../ui/Icon';
import { SortPill } from '../ui/SortPill';
import { Text } from '../ui/Text';
import { TextLink } from '../ui/TextLink';

/** Sort and mood filter appear from 4 published routes (Ecrans › E-09, E-16). */
const SORTABLE_FROM = 4;

/**
 * « À la une »: the routes the creator chose, in carousel cards, in their order, each opening
 * its sheet; all as tall as the tallest (Accessibilité). Absent without any.
 */
export function FeaturedCarousel({
  routes,
  onOpen,
}: {
  routes: readonly RouteCardData[];
  onOpen: (route: RouteCardData) => void;
}) {
  const { t } = useTranslation();
  const [tallest, setTallest] = useState(0);
  if (routes.length === 0) {
    return null;
  }
  return (
    <View className="gap-12">
      <Text variant="title-m" accessibilityRole="header">
        {t('profile.featured')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Out to the edges of the screen, the cards kept in line with the page.
        className="-mx-16"
        contentContainerClassName="gap-12 px-16"
      >
        {routes.map((route) => (
          <RouteCard
            key={route.id}
            route={route}
            position={null}
            isCreatorLinked={false}
            minHeight={tallest || undefined}
            onLayout={(event) => {
              const { height } = event.nativeEvent.layout;
              setTallest((current) => Math.max(current, height));
            }}
            onPress={() => onOpen(route)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * « Sur le terrain » (D-056): the distinct places the creator confirmed during outings, a card
 * read as one element under its header (D-058); absent at zero.
 */
export function FieldWork({ count }: { count: number | null }) {
  const { t } = useTranslation();
  if (count === null || count === 0) {
    return null;
  }
  const title = t('creator.fieldWork.count', { count });
  const body = t('creator.fieldWork.body');
  return (
    <View className="gap-12">
      <Text variant="title-m" accessibilityRole="header">
        {t('creator.fieldWork.title')}
      </Text>
      <View
        accessible
        accessibilityLabel={`${title}. ${body}`}
        className="flex-row items-start gap-12 rounded-section bg-surface p-16"
      >
        <View className="size-disc items-center justify-center rounded-pill bg-bg">
          <Icon {...uiIcon('field-work')} size="icon-m" />
        </View>
        <View className="flex-1 gap-4">
          <Text variant="item">{title}</Text>
          <Text variant="body-s" color="muted">
            {body}
          </Text>
        </View>
      </View>
    </View>
  );
}

interface CreatorRoutesProps {
  profile: PublicProfile;
  routes: readonly RouteCardData[];
  sort: ProfileRouteSort;
  moods: readonly Mood[];
  /** « Trier par », out of the scroll view, whose touches would hold the taps on its veil. */
  onOpenSort: () => void;
  onToggleMood: (mood: Mood) => void;
  onOpen: (route: RouteCardData) => void;
  /** The next page of the routes, while there is one. */
  more: { isLoading: boolean; hasFailed: boolean; onLoad: () => void } | null;
}

/**
 * « Tous ses parcours (8) »: the published routes in list cards; from 4 routes, the « Récents »
 * pill opens « Trier par » and the mood chips, with their count, filter them, both together.
 * « Ses parcours (1) » below; « Aucun parcours publié pour l'instant » without any.
 */
export function CreatorRoutes({
  profile,
  routes,
  sort,
  moods,
  onOpenSort,
  onToggleMood,
  onOpen,
  more,
}: CreatorRoutesProps) {
  const { t } = useTranslation();
  const total = profile.routesPublished ?? 0;
  const isSortable = total >= SORTABLE_FROM;
  const presentMoods = taxonomies.moods.filter((mood) => (profile.moodCounts[mood] ?? 0) > 0);
  const sortLabel = t(`creator.sort.${sort}.label`);

  return (
    <View className="gap-12">
      <Text variant="title-m" accessibilityRole="header">
        {t(isSortable ? 'creator.routes.all' : 'creator.routes.some', { count: total })}
      </Text>
      {isSortable && (
        <>
          <SortPill
            label={sortLabel}
            accessibilityLabel={t('sort.pill', { sort: sortLabel })}
            onPress={onOpenSort}
          />
          <View
            accessibilityRole="list"
            accessibilityLabel={t('creator.routes.moodsLabel')}
            className="flex-row flex-wrap gap-8"
          >
            {presentMoods.map((mood) => {
              const label = taxonomyLabels().moods[mood];
              const count = profile.moodCounts[mood] ?? 0;
              return (
                <Chip
                  key={mood}
                  label={`${label} ${count}`}
                  accessibilityLabel={t('creator.routes.mood', { mood: label, count })}
                  icon={filterIcons.moods[mood]}
                  surface="surface"
                  isActive={moods.includes(mood)}
                  onPress={() => onToggleMood(mood)}
                />
              );
            })}
          </View>
        </>
      )}
      {routes.length === 0 ? (
        <Text variant="body" color="muted">
          {t('creator.routes.empty')}
        </Text>
      ) : (
        routes.map((route) => (
          <RouteCard
            key={route.id}
            route={route}
            position={null}
            variant="list"
            isCreatorLinked={false}
            onPress={() => onOpen(route)}
          />
        ))
      )}
      {more &&
        (more.isLoading ? (
          <ActivityIndicator accessibilityLabel={t('list.loadingMore')} />
        ) : (
          <TextLink
            role="button"
            label={more.hasFailed ? t('list.moreFailed') : t('creator.routes.more')}
            onPress={more.onLoad}
          />
        ))}
    </View>
  );
}
