import { labels, type RouteDetailStep, type SheetStep, type StepTransition } from '@widoo/shared';
import { colors, filterIcons, motion, size, spacing, type UiIconKey } from '@widoo/tokens';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { formatDuration } from '../format/duration';
import { Icon, uiIcon } from '../ui/Icon';
import { StepDot } from '../ui/StepDot';
import { Text } from '../ui/Text';
import { TextLink } from '../ui/TextLink';
import { hoursLine, parisTime, transitionText, verificationText, type Spoken } from './sheetText';

/** M-08: a step unfolds in `base`, its detail fading in; with « Réduire les animations », in place. */
export const stepLayout = LinearTransition.duration(motion.durations.base).reduceMotion(
  ReduceMotion.System,
);
const detailEntering = FadeIn.duration(motion.durations.fade).reduceMotion(ReduceMotion.Never);

interface StepItemProps {
  step: SheetStep;
  total: number;
  /** Suggested arrival, « 10:35 ». */
  time: Spoken;
  isExpanded: boolean;
  onToggle: () => void;
  /** First name of the creator, Widoo for the team: « Le conseil de Widoo ». */
  creatorName: string;
  now: Date;
  onLayout?: (event: LayoutChangeEvent) => void;
  /** The widest time of the timeline, which every row takes so that the dots line up. */
  timeWidth: number;
  onTimeWidth: (width: number) => void;
}

/**
 * The column of the times: 44 points at least, widened with the text, and as wide as the widest
 * time of the timeline, so that the dots line up (Ecrans › E-05, texte agrandi).
 */
function TimeColumn({
  width,
  onWidth,
  children,
}: {
  width: number;
  onWidth: (width: number) => void;
  children: ReactNode;
}) {
  return (
    <View
      className="min-w-touch-min items-start pt-4"
      style={{ minWidth: Math.max(width, size['touch-min']) }}
      onLayout={(event) => onWidth(event.nativeEvent.layout.width)}
    >
      {children}
    </View>
  );
}

/** The dashed line between the dots, down to the next step (decorative). */
function Rail() {
  return <View className="flex-1 border-rail" style={styles.rail} />;
}

function TransitionLine({ transition }: { transition: StepTransition }) {
  const { t } = useTranslation();
  const text = transitionText(t, transition);
  return (
    <View accessible accessibilityLabel={text.spoken} className="flex-row items-center gap-8 pt-12">
      <Icon name={filterIcons.transports[transition.mode]} size="icon-s" color="muted" />
      <Text variant="body-s" color="muted" className="shrink">
        {text.short}
      </Text>
    </View>
  );
}

function DetailLine({ icon, children }: { icon: UiIconKey | null; children: ReactNode }) {
  return (
    <View className="flex-row items-start gap-8">
      {icon ? (
        <Icon {...uiIcon(icon)} size="icon-m" color="muted" />
      ) : (
        <View className="size-icon-m" />
      )}
      <View className="flex-1 gap-4">{children}</View>
    </View>
  );
}

/** What an unfolded step tells (Ecrans › E-05, étapes), read only until v0.5 for its verification. */
function StepDetail({
  step,
  creatorName,
  now,
}: {
  step: RouteDetailStep;
  creatorName: string;
  now: Date;
}) {
  const { t } = useTranslation();
  const hours = hoursLine(t, step, now);
  const verification = verificationText(t, step, now);
  const cost = step.costPerPersonEur;
  return (
    <Animated.View entering={detailEntering} className="gap-12 pt-12">
      {verification.kind === 'reported' && (
        <View
          accessible
          accessibilityLabel={verification.banner}
          className="flex-row items-start gap-8 rounded-block bg-alert-soft p-12"
        >
          <Icon {...uiIcon('alert')} size="icon-m" color="alert" />
          <Text variant="body-medium" color="alert" className="shrink">
            {verification.banner}
          </Text>
        </View>
      )}
      {step.place.photoUrl && (
        <Image
          source={{ uri: step.place.photoUrl }}
          contentFit="cover"
          transition={motion.durations.fade}
          accessibilityIgnoresInvertColors
          className="aspect-video rounded-photo"
        />
      )}
      {hours && (
        <DetailLine icon="duration">
          {hours.kind === 'open' ? (
            <Text variant="body" accessibilityLabel={hours.spoken}>
              <Text variant="body" color="green-ink">
                {t('route.step.open')}
              </Text>
              {` ${hours.hours}`}
            </Text>
          ) : (
            <Text variant="body">{hours.text}</Text>
          )}
        </DetailLine>
      )}
      {cost !== null && (
        <DetailLine icon="budget">
          <Text
            variant="body"
            accessibilityLabel={
              cost === 0 ? t('route.step.costFree') : t('route.step.costSpoken', { euros: cost })
            }
          >
            {cost === 0 ? t('route.step.costFree') : t('route.step.cost', { euros: cost })}
          </Text>
        </DetailLine>
      )}
      {(step.bookingRequired || step.bookingUrl) && (
        <DetailLine icon={null}>
          <Text variant="body">{step.bookingNote ?? t('route.step.booking')}</Text>
          {step.bookingUrl && (
            <TextLink
              label={t('route.step.book')}
              accessibilityLabel={t('route.step.bookLabel', { place: step.place.name })}
              accessibilityHint={t('route.step.bookHint')}
              onPress={() => void Linking.openURL(step.bookingUrl as string)}
            />
          )}
          {step.bookingIsAffiliate && (
            <Text variant="caption" color="muted">
              {t('route.step.affiliate')}
            </Text>
          )}
        </DetailLine>
      )}
      {verification.kind === 'reported'
        ? verification.lastVisit && (
            <DetailLine icon="verified">
              <Text variant="body" color="green-ink">
                {verification.lastVisit}
              </Text>
            </DetailLine>
          )
        : verification.kind !== 'stale' && (
            <DetailLine icon={verification.kind === 'never' ? null : 'verified'}>
              <Text variant="body" color={verification.kind === 'never' ? 'muted' : 'green-ink'}>
                {verification.text}
              </Text>
            </DetailLine>
          )}
      {step.description && (
        <View className="rounded-block bg-surface p-12">
          <Text variant="body">
            <Text variant="item">{t('route.step.advice', { name: creatorName })}</Text>
            {step.description}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

/** What a screen reader says of a step: position, time, name, category, duration, state. */
function stepLabel(
  t: TFunction,
  step: SheetStep,
  total: number,
  time: Spoken,
  isExpanded: boolean,
  now: Date,
) {
  const position = step.position + 1;
  const category = labels.fr.placeCategories[step.isLocked ? step.category : step.place.category];
  const duration = formatDuration(t, step.durationMin, 'spoken');
  if (step.isLocked) {
    return t('route.step.lockedLabel', { position, total, time: time.spoken, category, duration });
  }
  const verification = verificationText(t, step, now);
  return [
    t('route.step.label', {
      position,
      total,
      time: time.spoken,
      name: step.title ?? step.place.name,
      category,
      duration,
    }),
    verification.kind === 'reported' && t('route.step.reported'),
    verification.kind === 'stale' && verification.text.toLowerCase(),
    isExpanded ? t('route.step.expanded') : t('route.step.collapsed'),
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * A step of the timeline: suggested time in a column of 44 points at least, which widens with the
 * text; the dot of its family and category, as on the map; name and category, its duration, a
 * chevron. A tap unfolds it. A step locked for Premium (D-014) keeps its time, dot, duration and
 * trip, its name replaced by its category and « Réservé à Premium », a padlock for the chevron.
 */
export function StepItem({
  step,
  total,
  time,
  isExpanded,
  onToggle,
  creatorName,
  now,
  onLayout,
  timeWidth,
  onTimeWidth,
}: StepItemProps) {
  const { t } = useTranslation();
  const category = step.isLocked ? step.category : step.place.category;
  const label = stepLabel(t, step, total, time, isExpanded, now);
  const isReported = !step.isLocked && step.verification.reports !== null;
  const stale = !step.isLocked ? verificationText(t, step, now) : null;

  const head = (
    <View className="flex-row items-start gap-8">
      <View className="flex-1">
        <Text variant="title-s">
          {step.isLocked ? labels.fr.placeCategories[category] : (step.title ?? step.place.name)}
        </Text>
        <Text variant="body-s" color="muted">
          {step.isLocked ? t('route.step.locked') : labels.fr.placeCategories[category]}
        </Text>
        {stale?.kind === 'stale' && (
          <View className="flex-row items-start gap-6 pt-4">
            <Icon {...uiIcon('last-check')} size="icon-s" />
            <Text variant="label" color="muted" className="shrink">
              {stale.text}
            </Text>
          </View>
        )}
      </View>
      <Text variant="label-strong">{formatDuration(t, step.durationMin, 'short')}</Text>
      <Icon
        {...uiIcon(step.isLocked ? 'private' : isExpanded ? 'collapse-step' : 'expand-step')}
        size="icon-m"
        color="muted"
      />
    </View>
  );

  return (
    <Animated.View layout={stepLayout} onLayout={onLayout} className="flex-row gap-12">
      <TimeColumn width={timeWidth} onWidth={onTimeWidth}>
        <Text variant="item" importantForAccessibility="no" accessibilityElementsHidden>
          {time.short}
        </Text>
      </TimeColumn>
      <View className="items-center">
        <View>
          <StepDot category={category} />
          {isReported && (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className="absolute -right-4 -top-4 size-icon-s items-center justify-center rounded-pill border border-bg bg-alert"
            >
              <Text variant="caption" color="on-strong" isDense>
                !
              </Text>
            </View>
          )}
        </View>
        <Rail />
      </View>
      <View className="flex-1 pb-20">
        {step.isLocked ? (
          <View accessible accessibilityLabel={label}>
            {head}
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ expanded: isExpanded }}
            onPress={onToggle}
          >
            {head}
          </Pressable>
        )}
        {!step.isLocked && isExpanded && (
          <StepDetail step={step} creatorName={creatorName} now={now} />
        )}
        {step.transition && <TransitionLine transition={step.transition} />}
      </View>
    </Animated.View>
  );
}

/** « Fin du parcours » after the last step, on an ink dot with the flag, and its time. */
export function EndItem({
  time,
  onLayout,
  timeWidth,
  onTimeWidth,
}: {
  time: Spoken;
  onLayout?: (event: LayoutChangeEvent) => void;
  timeWidth: number;
  onTimeWidth: (width: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityLabel={t('route.endSpoken', { time: time.spoken })}
      className="flex-row items-center gap-12"
    >
      <TimeColumn width={timeWidth} onWidth={onTimeWidth}>
        <Text variant="item">{time.short}</Text>
      </TimeColumn>
      <View className="size-step-dot items-center justify-center rounded-pill bg-surface-strong">
        <Icon {...uiIcon('steps')} size="icon-s" color="on-strong" />
      </View>
      <Text variant="item" className="shrink">
        {t('route.end')}
      </Text>
    </View>
  );
}

/** The arrival time of the step at `index` in the timeline of the sheet. */
export function arrivalOf(t: TFunction, arrivesAt: string | undefined): Spoken {
  return arrivesAt ? parisTime(t, arrivesAt) : { short: '', spoken: '' };
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
