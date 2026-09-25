import { colors } from '@widoo/tokens';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { StatusMessage } from '../components/StatusMessage';
import { NoRoutesMessage } from '../components/ZoneMessage';
import type { SectionListStatus } from '../discovery/sections';
import { activeFilterCount } from '../discovery/store';
import { useDiscovery } from '../discovery/useRouteSearch';
import { Button } from '../ui/Button';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { RouteCardSkeleton } from './RouteCardSkeleton';
import { SheetBanner } from './SheetBanner';

interface ListHeaderProps {
  title: string;
  /** « Autour de République · rayon 2 km », « Autour de Paris » without position. */
  subtitle: string;
  /** Offline, the day and time of the routes on screen. */
  offlineSince: { day: string; time: string } | null;
  onBack: () => void;
}

/**
 * Head of « Voir tout »: back in a warm grey disc, the title of the section in 26 points and
 * its zone; offline, the line « Hors connexion · résultats du … » under it.
 */
export function ListHeader({ title, subtitle, offlineSince, onBack }: ListHeaderProps) {
  const { t } = useTranslation();
  return (
    <View className="gap-16 pb-16 pt-8">
      <View className="gap-8 px-16">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('list.back')}
          onPress={onBack}
          className="size-disc items-center justify-center rounded-pill bg-surface"
        >
          <Icon {...uiIcon('back')} size="space-24" />
        </Pressable>
        <Text variant="title-xl" accessibilityRole="header">
          {title}
        </Text>
        <Text variant="body" color="muted">
          {subtitle}
        </Text>
      </View>
      {offlineSince && <SheetBanner icon="offline" text={t('sheet.offline', offlineSince)} />}
    </View>
  );
}

/** Three loading cards of the list, announced busy with the search (Ecrans › E-04). */
export function ListSkeletons({ label }: { label: string }) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      className="gap-12 px-16 pt-12"
    >
      <RouteCardSkeleton variant="list" />
      <RouteCardSkeleton variant="list" />
      <RouteCardSkeleton variant="list" />
    </View>
  );
}

interface ListMessageProps {
  status: SectionListStatus;
  onRetry: () => void;
}

/**
 * The list without routes: none in the zone, with « Élargir la zone » and « Retirer les N
 * filtres »; a failure; no network and no routes kept. Each with « Réessayer » but the first.
 */
export function ListMessage({ status, onRetry }: ListMessageProps) {
  const { t } = useTranslation();
  const filterCount = useDiscovery((state) => activeFilterCount(state.filters));
  const widenZone = useDiscovery((state) => state.widenZone);
  const clearFilters = useDiscovery((state) => state.clearFilters);
  const retryButton = <Button label={t('sheet.retry')} onPress={onRetry} />;
  return (
    <View className="px-24 pt-32">
      {status === 'empty' ? (
        <NoRoutesMessage
          filterCount={filterCount}
          onWiden={widenZone}
          onClearFilters={clearFilters}
        />
      ) : (
        <StatusMessage
          icon={status === 'offline' ? 'offline' : 'error'}
          title={status === 'offline' ? t('sheet.noConnection') : t('sheet.error')}
          body={t('sheet.errorBody')}
          action={retryButton}
        />
      )}
    </View>
  );
}

interface ListFooterProps {
  /** A next page is on its way: the blue ring and « Chargement… ». */
  isLoading: boolean;
  /** A next page failed: « Réessayer » in its place. */
  hasFailed: boolean;
  onRetry: () => void;
}

/**
 * Foot of the list: the next page loading, or failed; at the end of the zone, nothing, the last
 * card closes the list (Ecrans › E-04, fin de liste sans indicateur).
 */
export function ListFooter({ isLoading, hasFailed, onRetry }: ListFooterProps) {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <View
        accessible
        accessibilityLabel={t('list.loadingMore')}
        accessibilityState={{ busy: true }}
        accessibilityLiveRegion="polite"
        className="min-h-button-h flex-row items-center justify-center gap-8 py-16"
      >
        <ActivityIndicator color={colors.blue} />
        <Text variant="body" color="muted">
          {t('list.loadingMore')}
        </Text>
      </View>
    );
  }
  if (hasFailed) {
    return (
      <View className="items-center gap-8 px-24 py-16">
        <Text variant="body" color="muted" className="text-center">
          {t('list.moreFailed')}
        </Text>
        <Button label={t('sheet.retry')} variant="secondary" onPress={onRetry} />
      </View>
    );
  }
  return <View className="h-24" />;
}
