import { type RouteDetailStep, type RouteTimeline } from '@widoo/shared';
import { colors, filterIcons, size, spacing } from '@widoo/tokens';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { formatDuration } from '../format/duration';
import { parisDay, transitionText } from '../route/sheetText';
import { Icon, uiIcon } from '../ui/Icon';
import { StepDot } from '../ui/StepDot';
import { Text } from '../ui/Text';
import { TextLink } from '../ui/TextLink';
import { clockOf, planMinuteOf } from './calendar';
import { stepMark, type StepMark } from './notice';
import { SectionTitle } from './PlanControls';
import { taxonomyLabels } from '../i18n/labels';

interface ProgrammeProps {
  steps: readonly RouteDetailStep[];
  timeline: RouteTimeline;
  day: string;
}

const timeOf = (iso: string) => clockOf(planMinuteOf(iso));

/**
 * « Le programme »: the timeline of the sheet for the day and the time chosen, as a list; each
 * step with its time, dot, name, category, duration, what its hours say and its trip; then « Fin
 * prévue vers 17:00 ». The column of the times takes the widest of them (règle de E-05).
 */
export function Programme({ steps, timeline, day }: ProgrammeProps) {
  const { t } = useTranslation();
  const [timeWidth, setTimeWidth] = useState(0);
  const handleWidth = (width: number) => setTimeWidth((current) => Math.max(current, width));
  const start = timeOf(timeline.startsAt);
  const end = timeOf(timeline.endsAt);
  return (
    <View className="gap-16">
      <SectionTitle title={t('plan.programme')} value={t('plan.summary', { start, end })} />
      <View accessibilityRole="list">
        {steps.map((step, index) => {
          const entry = timeline.steps[index];
          return entry ? (
            <ProgrammeRow
              key={step.id}
              step={step}
              time={timeOf(entry.arrivesAt)}
              mark={stepMark(step, entry, day)}
              timeWidth={timeWidth}
              onTimeWidth={handleWidth}
            />
          ) : null;
        })}
        <View
          accessible
          accessibilityLabel={t('plan.endExpected', { time: end })}
          className="flex-row items-center gap-12"
        >
          <TimeColumn width={timeWidth} onWidth={handleWidth} text={end} />
          <View className="size-step-dot items-center justify-center rounded-pill bg-surface-strong">
            <Icon {...uiIcon('steps')} size="icon-s" color="on-strong" />
          </View>
          <Text variant="item" className="shrink">
            {t('plan.endExpected', { time: end })}
          </Text>
        </View>
      </View>
    </View>
  );
}

function TimeColumn({
  width,
  onWidth,
  text,
}: {
  width: number;
  onWidth: (width: number) => void;
  text: string;
}) {
  return (
    <View
      style={{ minWidth: Math.max(width, size['touch-min']) }}
      onLayout={(event) => onWidth(event.nativeEvent.layout.width)}
      className="items-start"
    >
      <Text variant="item">{text}</Text>
    </View>
  );
}

function markText(t: ReturnType<typeof useTranslation>['t'], mark: StepMark): string {
  return 'time' in mark
    ? t(`plan.marks.${mark.kind}`, { time: mark.time })
    : t(`plan.marks.${mark.kind}`);
}

function ProgrammeRow({
  step,
  time,
  mark,
  timeWidth,
  onTimeWidth,
}: {
  step: RouteDetailStep;
  time: string;
  mark: StepMark | null;
  timeWidth: number;
  onTimeWidth: (width: number) => void;
}) {
  const { t } = useTranslation();
  const name = step.title ?? step.place.name;
  const category = taxonomyLabels().placeCategories[step.place.category];
  const until = step.endsOn ? t('plan.until', { date: parisDay(step.endsOn) }) : null;
  const marked = mark ? markText(t, mark) : null;
  const trip = step.transition ? transitionText(t, step.transition) : null;
  const label = [
    time,
    name,
    category,
    formatDuration(t, step.durationMin, 'spoken'),
    until,
    marked,
    trip?.spoken,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <View accessible accessibilityLabel={label} className="flex-row gap-12">
      <TimeColumn width={timeWidth} onWidth={onTimeWidth} text={time} />
      <View className="items-center">
        <StepDot category={step.place.category} />
        <View className="flex-1 border-rail" style={styles.rail} />
      </View>
      <View className="flex-1 gap-4 pb-20">
        <View className="flex-row items-start gap-8">
          <Text variant="title-s" className="flex-1">
            {name}
          </Text>
          <Text variant="label-strong">{formatDuration(t, step.durationMin, 'short')}</Text>
        </View>
        <View className="flex-row flex-wrap items-center gap-x-12 gap-y-4">
          <Text variant="body-s" color="muted">
            {category}
          </Text>
          {until && (
            <View className="flex-row items-center gap-4">
              <Icon {...uiIcon('ends')} size="icon-s" color="muted" />
              <Text variant="body-s" color="muted">
                {until}
              </Text>
            </View>
          )}
        </View>
        {marked && (
          <Text variant="body-s" color={mark?.kind === 'hoursUnknown' ? 'muted' : 'alert'}>
            {marked}
          </Text>
        )}
        {step.transition && trip && (
          <View className="flex-row items-center gap-8 pt-8">
            <Icon name={filterIcons.transports[step.transition.mode]} size="icon-s" color="muted" />
            <Text variant="body-s" color="muted" className="shrink">
              {trip.short}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

/** « Programme indisponible pour l'instant », in place of the programme; one can plan anyway. */
export function ProgrammeUnavailable({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="gap-16">
      <SectionTitle title={t('plan.programme')} />
      <View className="gap-12 rounded-block bg-surface p-16">
        <View accessible className="flex-row items-start gap-12">
          <Icon name="warning-circle" size="icon-l" />
          <View className="flex-1 gap-4">
            <Text variant="item">{t('plan.unavailable.title')}</Text>
            <Text variant="body-s" color="muted">
              {t('plan.unavailable.body')}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <TextLink
            label={t('plan.unavailable.retry')}
            accessibilityLabel={t('plan.unavailable.retryLabel')}
            icon="refresh"
            role="button"
            color="blue-ink"
            onPress={onRetry}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    borderLeftWidth: 2,
    borderStyle: 'dashed',
    // Android draws a dashed border on one side only with a radius.
    borderRadius: 1,
    borderColor: colors.rail,
    marginTop: spacing['space-4'],
  },
});
