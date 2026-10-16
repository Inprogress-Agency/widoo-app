import type { PlannedRoute } from '@widoo/shared';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { pastActionOf, pastPillOf, type PastAction } from './lists';
import { OutingRow, type RowAction } from './OutingRow';
import { myRatingText, pastDate } from './text';

interface PastListProps {
  outings: PlannedRoute[];
  now: Date;
  onOpen: (outing: PlannedRoute) => void;
  onAction: (outing: PlannedRoute, action: PastAction) => void;
}

const actionKeys = {
  rate: { label: 'routes.past.rate', spoken: 'routes.past.rateSpoken', isPrimary: true },
  relaunch: {
    label: 'routes.past.relaunch',
    spoken: 'routes.past.relaunchSpoken',
    isPrimary: false,
  },
  reschedule: {
    label: 'routes.past.reschedule',
    spoken: 'routes.past.rescheduleSpoken',
    isPrimary: false,
  },
} as const;

function rowAction(t: TFunction, outing: PlannedRoute, onAction: PastListProps['onAction']) {
  const action = pastActionOf(outing);
  if (!action) {
    return null;
  }
  const keys = actionKeys[action];
  return {
    label: t(keys.label),
    accessibilityLabel: t(keys.spoken, { title: outing.route.title }),
    isPrimary: keys.isPrimary,
    onPress: () => onAction(outing, action),
  } satisfies RowAction;
}

/** « 5 Votre note, Parfait », a star before it. */
function MyRating({ rating }: { rating: number }) {
  const { t } = useTranslation();
  const text = myRatingText(t, rating);
  return (
    <View className="flex-row items-center gap-6">
      <Icon {...uiIcon('rating')} size="icon-s" />
      <Text variant="label-strong">{text.value}</Text>
      <Text variant="body-s" color="muted">
        {text.label}
      </Text>
    </View>
  );
}

/**
 * « Passés » (Ecrans › E-08): a line per outing, its date and my rating, « Noter » while not
 * rated (E-15); « Arrêté » with « Relancer » (D-033); « Pas fait » with « Reprogrammer » (D-038).
 * No personal note (D-029). A tap opens the route.
 */
export function PastList({ outings, now, onOpen, onAction }: PastListProps) {
  const { t } = useTranslation();
  return (
    <View>
      {outings.map((outing) => {
        const date = pastDate(t, outing, now);
        const pill = pastPillOf(outing);
        const pillLabel = pill ? t(`routes.past.${pill}`) : null;
        const rating = outing.myRating?.rating ?? null;
        const spoken = [
          outing.route.title,
          date,
          pillLabel,
          rating === null ? null : myRatingText(t, rating).spoken,
        ];
        return (
          <OutingRow
            key={outing.id}
            routeId={outing.routeId}
            title={outing.route.title}
            lines={[date]}
            accessibilityLabel={spoken.filter(Boolean).join(', ')}
            extra={rating === null ? null : <MyRating rating={rating} />}
            pill={
              pillLabel
                ? { label: pillLabel, icon: pill === 'missed' ? 'missed' : undefined }
                : null
            }
            action={rowAction(t, outing, onAction)}
            onPress={outing.routeId ? () => onOpen(outing) : undefined}
          />
        );
      })}
    </View>
  );
}
