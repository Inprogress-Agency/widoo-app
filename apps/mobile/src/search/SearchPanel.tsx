import type { GeocodeZone, RouteCard } from '@widoo/shared';
import { motion } from '@widoo/tokens';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { StatusMessage } from '../components/StatusMessage';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import type { RecentZone } from './recentZones';
import {
  AroundMeRow,
  GroupHeader,
  RecentZoneRow,
  RouteRow,
  StatusLine,
  ZoneRow,
} from './SearchRows';
import type { TextSearchInput, TextSearchView } from './textSearch';

// The results come in a fade (M-08), kept with « Réduire les animations ».
const resultsFade = FadeIn.duration(motion.durations.fade).reduceMotion(ReduceMotion.Never);

/** Routes shown before « Voir les N parcours » (Ecrans › E-02, saisie). */
const FIRST_ROUTES = 3;

interface SearchPanelProps {
  text: string;
  view: TextSearchView;
  input: TextSearchInput;
  recentZones: readonly RecentZone[];
  onChooseZone: (zone: RecentZone) => void;
  onRemoveRecent: (id: string) => void;
  onClearRecent: () => void;
  onAroundMe: () => void;
  onOpenRoute: (route: RouteCard) => void;
  retryZones: () => void;
  retryRoutes: () => void;
}

/**
 * What the search shows under its field (Ecrans › E-02): « Autour de moi » and the recent zones
 * while the field is empty, then the zones and the routes of the text, each group with its own
 * state; the messages of the states as discreet lines, or centred for no result and the total
 * error.
 */
export function SearchPanel(props: SearchPanelProps) {
  const { t } = useTranslation();
  const { view, text, input } = props;
  const retryAll = () => {
    props.retryZones();
    props.retryRoutes();
  };

  switch (view.kind) {
    case 'recent':
      return <RecentPanel {...props} isOffline={!input.isOnline} />;
    case 'offline':
      return (
        <View className="gap-8 px-16 pt-8">
          <StatusLine icon="offline" text={t('search.offline')} />
          <Text variant="body" color="muted">
            {t('search.offlineHelp')}
          </Text>
        </View>
      );
    case 'failed':
      return (
        <View className="px-24">
          <StatusMessage
            icon="error"
            title={t('search.failed')}
            body={t('search.failedBody')}
            action={
              <View className="items-center">
                <Button label={t('sheet.retry')} onPress={retryAll} />
              </View>
            }
          />
        </View>
      );
    case 'empty':
      return (
        <View className="px-24">
          <StatusMessage
            icon="empty"
            title={t('search.empty', { text })}
            body={t('search.emptyBody')}
          />
        </View>
      );
    case 'results':
      return <ResultsPanel {...props} />;
  }
}

function RecentPanel({
  recentZones,
  onChooseZone,
  onRemoveRecent,
  onClearRecent,
  onAroundMe,
  isOffline,
}: SearchPanelProps & { isOffline: boolean }) {
  const { t } = useTranslation();
  return (
    <View className="px-16">
      {isOffline && <StatusLine icon="offline" text={t('search.offline')} />}
      <AroundMeRow onPress={onAroundMe} />
      {recentZones.length > 0 && (
        <>
          <GroupHeader
            title={t('search.recent')}
            action={{
              label: t('search.clearRecent'),
              accessibilityLabel: t('search.clearRecentLabel'),
              onPress: onClearRecent,
            }}
          />
          {recentZones.map((zone) => (
            <RecentZoneRow
              key={zone.id}
              zone={zone}
              onPress={() => onChooseZone(zone)}
              onRemove={() => onRemoveRecent(zone.id)}
            />
          ))}
        </>
      )}
    </View>
  );
}

function ResultsPanel({
  text,
  input,
  onChooseZone,
  onOpenRoute,
  retryZones,
  retryRoutes,
}: SearchPanelProps) {
  const { t } = useTranslation();
  const [expandedFor, setExpandedFor] = useState<string | null>(null);
  const zones: readonly GeocodeZone[] = input.zones.data ?? [];
  const routes: readonly RouteCard[] = input.routes.data ?? [];
  const isExpanded = expandedFor === input.settled;
  const shownRoutes = isExpanded ? routes : routes.slice(0, FIRST_ROUTES);
  const isZonesFailed = input.zones.status === 'error';
  const isRoutesFailed = input.routes.status === 'error';

  return (
    <Animated.View key={input.settled} entering={resultsFade} className="px-16">
      {(isZonesFailed || zones.length > 0) && (
        <View accessibilityRole="list">
          <GroupHeader title={t('search.zones')} />
          {isZonesFailed ? (
            <StatusLine
              icon="error"
              text={t('search.zonesFailed')}
              action={{
                label: t('sheet.retry'),
                accessibilityLabel: t('search.retryZones'),
                onPress: retryZones,
              }}
            />
          ) : (
            zones.map((zone) => (
              <ZoneRow key={zone.id} zone={zone} typed={text} onPress={() => onChooseZone(zone)} />
            ))
          )}
        </View>
      )}
      {(isRoutesFailed || routes.length > 0) && (
        <View accessibilityRole="list">
          <GroupHeader
            title={t('search.routes')}
            action={
              !isRoutesFailed && !isExpanded && routes.length > FIRST_ROUTES
                ? {
                    label: t('search.allRoutes', { count: routes.length }),
                    onPress: () => setExpandedFor(input.settled),
                  }
                : undefined
            }
          />
          {isRoutesFailed ? (
            <StatusLine
              icon="error"
              text={t('search.routesFailed')}
              action={{
                label: t('sheet.retry'),
                accessibilityLabel: t('search.retryRoutes'),
                onPress: retryRoutes,
              }}
            />
          ) : (
            shownRoutes.map((route) => (
              <RouteRow
                key={route.id}
                route={route}
                typed={text}
                onPress={() => onOpenRoute(route)}
              />
            ))
          )}
        </View>
      )}
    </Animated.View>
  );
}
