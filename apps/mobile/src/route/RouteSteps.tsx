import type { RouteDetail } from '@widoo/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type LayoutChangeEvent } from 'react-native';
import { Button } from '../ui/Button';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { TextLink } from '../ui/TextLink';
import { localTime } from './sheetText';
import { arrivalOf, EndItem, StepItem } from './StepItem';

interface RouteStepsProps {
  route: RouteDetail;
  /** The unfolded step, one at a time; null when all are folded. */
  expanded: number | null;
  onToggle: (index: number) => void;
  /** « Voir sur la carte »: home with the route selected (E-04); null when the map cannot. */
  onSeeOnMap: (() => void) | null;
  creatorName: string;
  now: Date;
  /** Where the timeline lies in the section, and each step and « Fin du parcours » in it. */
  onListLayout: (y: number) => void;
  onStepLayout: (index: number, y: number) => void;
  onEndLayout: (y: number) => void;
}

/**
 * « Les étapes » with their number, the suggested start and « Voir sur la carte », which goes
 * under the title when room lacks (`flexWrap`); the timeline down to « Fin du parcours »; after
 * it, for a locked Premium route, the box « Parcours Premium » (D-014, D-072).
 */
export function RouteSteps({
  route,
  expanded,
  onToggle,
  onSeeOnMap,
  creatorName,
  now,
  onListLayout,
  onStepLayout,
  onEndLayout,
}: RouteStepsProps) {
  const { t } = useTranslation();
  const start = localTime(t, route.timeline.startsAt, route.timezone);
  const lockedCount = route.steps.filter((step) => step.isLocked).length;
  // The widest time column of the rows, which they all take.
  const [timeWidth, setTimeWidth] = useState(0);
  const handleTimeWidth = (width: number) => setTimeWidth((current) => Math.max(current, width));
  return (
    <View className="gap-20">
      <View className="flex-row flex-wrap items-end justify-between gap-x-16 gap-y-8">
        <View className="gap-4">
          <View
            accessible
            accessibilityRole="header"
            accessibilityLabel={t('route.stepsHeader', { count: route.stepCount })}
            className="flex-row items-center gap-8"
          >
            <Text variant="title-l">{t('route.steps')}</Text>
            <Text variant="body-medium" color="muted">
              {t('route.stepCount', { count: route.stepCount })}
            </Text>
          </View>
          <Text
            variant="body-medium"
            color="muted"
            accessibilityLabel={t('route.suggestedStartSpoken', { time: start.spoken })}
          >
            {t('route.suggestedStart', { time: start.short })}
          </Text>
        </View>
        {onSeeOnMap && <TextLink label={t('route.seeOnMap')} icon="map" onPress={onSeeOnMap} />}
      </View>
      <View onLayout={(event) => onListLayout(event.nativeEvent.layout.y)}>
        {route.steps.map((step, index) => (
          <StepItem
            key={step.id}
            step={step}
            total={route.stepCount}
            time={arrivalOf(t, route.timeline.steps[index]?.arrivesAt, route.timezone)}
            isExpanded={expanded === index}
            onToggle={() => onToggle(index)}
            creatorName={creatorName}
            now={now}
            timeZone={route.timezone}
            timeWidth={timeWidth}
            onTimeWidth={handleTimeWidth}
            onLayout={(event: LayoutChangeEvent) => onStepLayout(index, event.nativeEvent.layout.y)}
          />
        ))}
        <EndItem
          time={localTime(t, route.timeline.endsAt, route.timezone)}
          timeWidth={timeWidth}
          onTimeWidth={handleTimeWidth}
          onLayout={(event) => onEndLayout(event.nativeEvent.layout.y)}
        />
      </View>
      {route.isLocked && <PremiumBox lockedCount={lockedCount} />}
    </View>
  );
}

/**
 * After « Fin du parcours » of a locked Premium route: the crown on an ink disc, « Parcours
 * Premium », the steps left to unlock. The purchase of the route (D-072) and the pass come with
 * the store (#67): the button is shown, disabled, and the price of the store is not invented.
 */
function PremiumBox({ lockedCount }: { lockedCount: number }) {
  const { t } = useTranslation();
  return (
    <View className="gap-16 rounded-section bg-surface p-16">
      <View accessible className="flex-row items-center gap-12">
        <View className="size-disc items-center justify-center rounded-pill bg-surface-strong">
          <Icon {...uiIcon('premium')} size="icon-l" />
        </View>
        <View className="flex-1">
          <Text variant="title-s">{t('route.premiumBox.title')}</Text>
          <Text variant="body-s" color="muted">
            {t('route.premiumBox.body', { count: lockedCount })}
          </Text>
        </View>
      </View>
      <Button
        label={t('route.premiumBox.unlock')}
        variant="inverse"
        isFullWidth
        isDisabled
        accessibilityHint={t('route.notYet')}
        onPress={() => undefined}
      />
    </View>
  );
}
