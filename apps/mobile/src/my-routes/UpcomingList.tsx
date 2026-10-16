import type { PlannedRoute } from '@widoo/shared';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Button } from '../ui/Button';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { toPrepareCount } from './lists';
import { OutingRow } from './OutingRow';
import { RoutePhoto } from './RoutePhoto';
import { laterLine, nextBadge, outingWindow } from './text';

interface UpcomingListProps {
  outings: PlannedRoute[];
  now: Date;
  onOpen: (outing: PlannedRoute) => void;
  onGo: (outing: PlannedRoute) => void;
}

/**
 * The next outing in a large card, read as one element, « C'est parti » a button apart, active
 * at any time (D-035): the photo with « Demain, 10:00 », the title, the window, the bookings
 * still to prepare.
 */
function NextOuting({
  outing,
  now,
  onOpen,
  onGo,
}: Omit<UpcomingListProps, 'outings'> & { outing: PlannedRoute }) {
  const { t } = useTranslation();
  const badge = nextBadge(t, outing, now);
  const window = outingWindow(t, outing, now);
  const toPrepare = toPrepareCount(outing);
  const toPrepareText = toPrepare > 0 ? t('routes.upcoming.toPrepare', { count: toPrepare }) : null;
  return (
    <View className="gap-16 rounded-section bg-surface p-8 pb-16">
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={[outing.route.title, badge.spoken, window.spoken, toPrepareText]
          .filter(Boolean)
          .join(', ')}
        onPress={() => onOpen(outing)}
        className="gap-8"
      >
        <RoutePhoto routeId={outing.routeId} className="h-card-photo rounded-photo">
          <View className="absolute left-8 top-8 min-h-badge-h flex-row items-center gap-6 rounded-pill bg-bg px-12">
            <Icon {...uiIcon('plan-date')} size="icon-s" color="ink" />
            <Text variant="label-strong" isDense>
              {badge.label}
            </Text>
          </View>
        </RoutePhoto>
        <View className="gap-4 px-8">
          <Text variant="title-s">{outing.route.title}</Text>
          <Text variant="body" color="muted">
            {window.label}
          </Text>
          {toPrepareText && (
            <View className="flex-row items-center gap-8">
              <Icon {...uiIcon('to-prepare')} size="icon-m" color="ink" />
              <Text variant="body-medium">{toPrepareText}</Text>
            </View>
          )}
        </View>
      </Pressable>
      <View className="px-8">
        <Button
          isFullWidth
          label={t('routes.upcoming.go')}
          accessibilityLabel={t('routes.upcoming.goSpoken', { title: outing.route.title })}
          onPress={() => onGo(outing)}
        />
      </View>
    </View>
  );
}

/** « À venir » (Ecrans › E-08): the next outing, then « Plus tard » in lines. */
export function UpcomingList({ outings, now, onOpen, onGo }: UpcomingListProps) {
  const { t } = useTranslation();
  const [next, ...later] = outings;
  if (!next) {
    return null;
  }
  return (
    <View className="gap-24">
      <NextOuting outing={next} now={now} onOpen={onOpen} onGo={onGo} />
      {later.length > 0 && (
        <View>
          <Text
            variant="title-s"
            accessibilityRole="header"
            className="border-b border-surface pb-12"
          >
            {t('routes.upcoming.later')}
          </Text>
          {later.map((outing) => {
            const line = laterLine(t, outing, now);
            return (
              <OutingRow
                key={outing.id}
                routeId={outing.routeId}
                title={outing.route.title}
                lines={[line]}
                accessibilityLabel={`${outing.route.title}, ${line}`}
                onPress={() => onOpen(outing)}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}
