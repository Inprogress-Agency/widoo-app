import type { PlannedRoute, RouteDetail, RouteDetailStep, RouteTimeline } from '@widoo/shared';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { planDayOf } from '../plan/calendar';
import { Checklist } from '../plan/Checklist';
import { Programme } from '../plan/Programme';
import { usePlanTimeline } from '../plan/usePlanTimeline';
import { RoutePhoto } from '../my-routes/RoutePhoto';
import { placeText } from '../results/cardText';
import { MoodDot } from '../ui/MoodDot';
import { SettingsRow } from '../ui/SettingsRow';
import { Text } from '../ui/Text';
import { DateCard } from './DateCard';
import { dateCardText } from './outingText';

export const unlockedSteps = (route: RouteDetail) =>
  route.steps.filter((step): step is RouteDetailStep => !step.isLocked);

/** The timeline planned, while its steps are still those of the route as it reads now. */
function plannedTimeline(outing: PlannedRoute, steps: readonly RouteDetailStep[]) {
  const ids = outing.route.steps.map((step) => step.id);
  return ids.length === steps.length && steps.every((step, index) => step.id === ids[index])
    ? outing.timeline
    : null;
}

interface OutingBodyProps {
  outing: PlannedRoute;
  route: RouteDetail | null;
  isOnline: boolean;
  checked: ReadonlySet<string>;
  now: Date;
  onChange: (() => void) | null;
  onToggle: (step: RouteDetailStep) => void;
  onBook: (step: RouteDetailStep) => void;
  onSeeRoute: (() => void) | null;
  onCancel: () => void;
}

/**
 * What « Votre sortie » shows (Ecrans › E-08): the thumbnail and the title, the card of date,
 * « À préparer », the programme of the day, « Voir la fiche du parcours » and « Annuler la sortie ».
 * The programme is asked again for the start, the one planned meanwhile, and offline.
 */
export function OutingBody(props: OutingBodyProps) {
  const { outing, route, isOnline, checked, now, onChange, onToggle, onBook } = props;
  const { t } = useTranslation();
  const date = dateCardText(t, outing, now);
  const steps = route ? unlockedSteps(route) : [];
  const fresh = usePlanTimeline(route?.id ?? '', outing.startsAt, route !== null && isOnline);
  const timeline: RouteTimeline | null = fresh.timeline ?? plannedTimeline(outing, steps);
  const place = route ? placeText(route) : '';
  const mood = route?.moods[0];
  return (
    <View className="gap-24">
      <View className="flex-row items-center gap-16">
        <RoutePhoto routeId={outing.routeId} className="size-thumb rounded-thumb" />
        <View className="flex-1 gap-4">
          <Text variant="title-m" accessibilityRole="header">
            {outing.route.title}
          </Text>
          {place !== '' && (
            <View className="flex-row items-center gap-8">
              {mood && <MoodDot mood={mood} />}
              <Text variant="body-medium" color="muted" className="shrink">
                {place}
              </Text>
            </View>
          )}
        </View>
      </View>
      <DateCard day={date.day} hours={date.hours} spoken={date.spoken} onChange={onChange} />
      <Checklist
        bookings={steps.filter((step) => step.bookingRequired)}
        checked={checked}
        onToggle={onToggle}
        onBook={onBook}
      />
      {timeline && route && (
        <Programme steps={steps} timeline={timeline} day={planDayOf(outing.startsAt)} />
      )}
      <View className="border-t border-line">
        {props.onSeeRoute && (
          <SettingsRow icon="map" label={t('routes.outing.seeRoute')} onPress={props.onSeeRoute} />
        )}
        <SettingsRow
          icon="cancel-outing"
          label={t('routes.outing.cancel')}
          role="button"
          onPress={props.onCancel}
        />
      </View>
    </View>
  );
}
