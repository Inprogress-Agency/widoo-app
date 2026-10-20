import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { PlannedRoute } from '@widoo/shared';
import { filterIcons, size } from '@widoo/tokens';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, useWindowDimensions } from 'react-native';
import { ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDuration } from '../format/duration';
import { localTime, transitionText } from '../route/sheetText';
import { Button } from '../ui/Button';
import { haptic } from '../ui/haptics';
import { Icon, uiIcon } from '../ui/Icon';
import { ModalSheetBackground, ModalSheetHandle } from '../ui/ModalSheetParts';
import { StepDot } from '../ui/StepDot';
import { Text } from '../ui/Text';
import { TextLink } from '../ui/TextLink';
import { stepName, timelineState } from './goText';
import type { GoProgress, GoStep } from './progress';

/** Height the sheet keeps half open: its title and the top of its list (Ecrans › E-07). */
export const GO_SHEET_PEEK = size['sheet-rest'];
/** Stretched, the sheet stops this far from the top, the page veiled behind it. */
const STRETCHED_TOP = 110;

interface GoSheetProps {
  planned: PlannedRoute;
  progress: GoProgress;
  onFinish: () => void;
  onStop: () => void;
}

const toneColor = { done: 'green-ink', current: 'blue-ink', muted: 'muted' } as const;

function TimelineRow({ entry, progress }: { entry: GoStep; progress: GoProgress }) {
  const { t } = useTranslation();
  const time = entry.times ? localTime(t, entry.times.arrivesAt) : null;
  const state = timelineState(t, entry, progress.phase);
  const duration = formatDuration(t, entry.step.durationMin, 'short');
  const transition = entry.step.transition ? transitionText(t, entry.step.transition) : null;
  const isPast = entry.status === 'done' || entry.status === 'skipped';
  return (
    <View className="flex-row gap-12">
      <View
        accessible
        accessibilityLabel={[
          entry.status === 'skipped' || !time ? null : time.spoken,
          stepName(entry.step),
          formatDuration(t, entry.step.durationMin, 'spoken'),
          state.text,
        ]
          .filter(Boolean)
          .join(', ')}
        className="flex-1 flex-row gap-12"
      >
        <View className="min-w-touch-min pt-4">
          <Text variant="body-medium" color="muted">
            {entry.status === 'skipped' ? '–' : (time?.short ?? '')}
          </Text>
        </View>
        <View className="w-step-dot-active items-center">
          {entry.status === 'done' ? (
            <View className="size-step-dot items-center justify-center rounded-pill bg-green-soft">
              <Icon {...uiIcon('done')} size="icon-s" color="green-ink" />
            </View>
          ) : (
            <StepDot category={entry.step.place.category} isActive={entry.status === 'current'} />
          )}
          {entry.step.transition && (
            <View className="w-4 flex-1 border-l border-dashed border-rail" />
          )}
        </View>
        <View className="flex-1 gap-4 pb-20">
          <View className="flex-row items-start gap-8">
            <Text variant="title-s" color={isPast ? 'muted' : 'ink'} className="flex-1">
              {stepName(entry.step)}
            </Text>
            <Text variant="body-medium" color="ink">
              {duration}
            </Text>
          </View>
          <Text variant="body-medium" color={toneColor[state.tone]}>
            {state.text}
          </Text>
          {transition && entry.step.transition && (
            <View
              accessible
              accessibilityLabel={transition.spoken}
              className="flex-row items-center gap-8 pt-8"
            >
              <Icon
                name={filterIcons.transports[entry.step.transition.mode]}
                size="icon-s"
                color="muted"
              />
              <Text variant="body-s" color="muted" className="shrink">
                {transition.short}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

/**
 * The sheet « Le parcours » of E-07 (M-04): half open at the foot of the page, the top of the
 * same list as stretched; two detents, which follow the finger, and the adjustable header for the
 * screen readers. The timeline of the outing with the state of each step, then « Terminer la
 * sortie » and « Arrêter le parcours ». No Google Maps link for the whole route (D-032).
 */
export function GoSheet({ planned, progress, onFinish, onStop }: GoSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheet = useRef<BottomSheet>(null);
  const [index, setIndex] = useState(0);
  const start = localTime(t, planned.timeline.startsAt);
  const end = localTime(t, planned.timeline.endsAt);
  const snapPoints = [GO_SHEET_PEEK + insets.bottom, height - STRETCHED_TOP];
  return (
    <BottomSheet
      ref={sheet}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      overrideReduceMotion={ReduceMotion.System}
      backgroundComponent={ModalSheetBackground}
      handleComponent={ModalSheetHandle}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={1}
          disappearsOnIndex={0}
          pressBehavior={0}
        />
      )}
      onChange={(next) => {
        if (next >= 0 && next !== index) {
          setIndex(next);
          haptic('sheetDetent');
        }
      }}
      accessible={false}
    >
      <BottomSheetScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`${t('go.sheet.title')}, ${t('go.sheet.times', { start: start.spoken, end: end.spoken })}`}
          accessibilityActions={[
            { name: 'increment', label: t('go.sheet.expand') },
            { name: 'decrement', label: t('go.sheet.reduce') },
          ]}
          onAccessibilityAction={(event) =>
            sheet.current?.snapToIndex(event.nativeEvent.actionName === 'increment' ? 1 : 0)
          }
          className="flex-row flex-wrap items-baseline justify-between gap-x-16 gap-y-4 px-16 pb-16"
        >
          <Text variant="title-l">{t('go.sheet.title')}</Text>
          <Text variant="body-medium" color="muted">
            {t('go.sheet.times', { start: start.short, end: end.short })}
          </Text>
        </View>
        <View className="px-16">
          {progress.steps.map((entry) => (
            <TimelineRow key={entry.step.id} entry={entry} progress={progress} />
          ))}
          <View accessible className="flex-row items-center gap-12 pb-24">
            <View className="min-w-touch-min">
              <Text variant="body-medium" color="muted">
                {end.short}
              </Text>
            </View>
            <View className="w-step-dot-active items-center">
              <View className="size-step-dot items-center justify-center rounded-pill bg-surface-strong">
                <Icon name="flag" weight="fill" size="icon-s" color="on-strong" />
              </View>
            </View>
            <Text variant="title-s" className="flex-1">
              {t('go.sheet.end', { time: end.short })}
            </Text>
          </View>
          <View className="gap-16">
            <Button label={t('go.finish')} isFullWidth onPress={onFinish} />
            <View className="flex-row justify-center">
              <TextLink label={t('go.sheet.stop')} role="button" onPress={onStop} />
            </View>
          </View>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
