import type { RouteCard } from '@widoo/shared';
import { size, spacing } from '@widoo/tokens';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Image, View, findNodeHandle, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { formatDuration } from '../format/duration';
import { Button } from '../ui/Button';
import { Icon, uiIcon } from '../ui/Icon';
import { timing } from '../ui/motion';
import { Rating } from '../ui/Rating';
import { Text } from '../ui/Text';
import { useIsLargeText } from '../ui/useIsLargeText';
import { stepLine } from './stepLine';
import type { TooltipSide } from './tooltip';

interface RouteTooltipProps {
  route: RouteCard;
  /** The card is locked (`RouteCard.isLocked`): no step is named (D-014, D-075). */
  isLocked: boolean;
  /** The step it points at, from 1: the start, or the step the user tapped. */
  position: number;
  /** Position of the arrow along the tooltip, from 0 to 1: it points at the step. */
  arrowAt: number;
  /** Its width (`tooltipWidth`); null until its title is measured, when it waits unseen. */
  width: number | null;
  /** Width of its title row laid out on one line, the rating included: its width follows it. */
  onTitleRowWidth: (width: number) => void;
  /** Above its step, the arrow at the bottom, or below it, the arrow at the top (D-084). */
  side?: TooltipSide;
  onOpen: () => void;
  onClose: () => void;
  /** Its height as laid out, arrow and gap to the dot included: the map frames the route with it. */
  onHeightChange: (height: number) => void;
}

/**
 * Ink tooltip of a selected route, anchored on its start or on the step tapped (Ecrans › E-04):
 * title and rating, the step (place name, then « Étape i/n · category · duration »), « Voir
 * plus ». Locked, the step line becomes « Parcours Premium » and the number of steps. It fades
 * in, with or without « Réduire les animations », and takes the screen reader focus as a dialog;
 * the escape gesture closes it. From 130 % of text, only the title, on two lines at most, and the
 * rating remain. Below its step, the arrow points up at it. Its title row is laid out once more
 * on one line, unseen, for its width to follow it (D-041); it shows once its width is known.
 */
export function RouteTooltip({
  route,
  isLocked,
  position,
  arrowAt,
  width,
  onTitleRowWidth,
  side = 'above',
  onOpen,
  onClose,
  onHeightChange,
}: RouteTooltipProps) {
  const { t } = useTranslation();
  const isLargeText = useIsLargeText();
  const { width: screenWidth } = useWindowDimensions();
  const isShown = width !== null;
  const summary = useRef<View>(null);
  const opacity = useSharedValue(0);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  useEffect(() => {
    if (!isShown) {
      return;
    }
    opacity.set(withTiming(1, timing('fade', 'fade')));
    const node = findNodeHandle(summary.current);
    if (node !== null) {
      AccessibilityInfo.setAccessibilityFocus(node);
    }
  }, [opacity, isShown]);

  // A locked card carries its start alone: the count comes from the card, not its pins.
  const { stepCount } = route;
  const step = route.steps[position - 1];
  const line = step ? stepLine(t, step, position, stepCount) : null;
  const dialogLabel = isLocked
    ? t('map.tooltip.lockedLabel', {
        title: route.title,
        count: stepCount,
        duration: formatDuration(t, route.durationMin, 'spoken'),
      })
    : t('map.tooltip.label', {
        title: route.title,
        position,
        total: stepCount,
        step: line?.spoken,
      });

  // Centred on its share of the width: the arrow points at the step, half under the tooltip.
  const arrowView = (
    <View
      pointerEvents="none"
      className={`${side === 'above' ? '-mt-6' : '-mb-6'} size-12 rotate-45 bg-surface-strong`}
      style={{ marginLeft: arrowAt * (width ?? 0) - spacing['space-12'] / 2 }}
    />
  );
  // The tooltip points at the step dot, tapped and so at its active size, not into it. The gap
  // and the arrow let a tap through to the steps under them.
  const gap = <View pointerEvents="none" style={{ height: size['step-dot-active'] / 2 }} />;

  // The title and the rating on one line, in a row as wide as the screen, never seen nor read.
  const titleRow = (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="absolute opacity-0"
      // Width of the screen, measured at runtime.
      style={{ width: screenWidth }}
    >
      <View
        className="flex-row items-start gap-8 self-start"
        onLayout={(event) => onTitleRowWidth(event.nativeEvent.layout.width)}
      >
        <Text variant="title-s" numberOfLines={1}>
          {route.title}
        </Text>
        <Rating rating={route.rating} variant="number-m" />
      </View>
    </View>
  );

  if (!isShown) {
    return (
      <View pointerEvents="none" style={{ width: size['tooltip-min-w'] }}>
        {titleRow}
      </View>
    );
  }

  return (
    <Animated.View
      style={[fade, { width }]}
      pointerEvents="box-none"
      onLayout={(event) => onHeightChange(event.nativeEvent.layout.height)}
    >
      {titleRow}
      {side === 'below' && gap}
      {side === 'below' && arrowView}
      <View
        onAccessibilityEscape={onClose}
        className="gap-12 self-stretch rounded-block bg-surface-strong p-16"
      >
        <View
          ref={summary}
          accessible
          role="dialog"
          accessibilityLabel={dialogLabel}
          className="gap-12"
        >
          {/* At large text sizes, the rating moves under the title, which keeps the full width. */}
          <View className={isLargeText ? 'items-start gap-8' : 'flex-row items-start gap-8'}>
            <Text
              variant="title-s"
              color="on-strong"
              // Two lines at most, at large text sizes too, the tooltip then at its widest (D-041).
              numberOfLines={2}
              className={isLargeText ? undefined : 'flex-1'}
            >
              {route.title}
            </Text>
            <Rating rating={route.rating} variant="number-m" color="on-strong" />
          </View>
          {!isLargeText && (
            <View className="flex-row items-center gap-12">
              <View className="size-thumb items-center justify-center overflow-hidden rounded-thumb bg-surface-strong-raised">
                {route.coverUrl ? (
                  <Image
                    source={{ uri: route.coverUrl }}
                    resizeMode="cover"
                    className="size-full"
                  />
                ) : (
                  <Icon {...uiIcon('map')} color="on-strong-muted" />
                )}
              </View>
              <View className="flex-1 gap-4">
                {isLocked ? (
                  <View className="flex-row items-center gap-6">
                    <Icon {...uiIcon('premium')} size="icon-s" />
                    <Text variant="item" color="on-strong">
                      {t('map.tooltip.premium')}
                    </Text>
                  </View>
                ) : (
                  <Text variant="item" color="on-strong">
                    {line?.name}
                  </Text>
                )}
                <Text variant="body-s" color="on-strong-muted">
                  {isLocked
                    ? t('map.tooltip.steps', {
                        count: stepCount,
                        duration: formatDuration(t, route.durationMin, 'short'),
                      })
                    : line?.detail}
                </Text>
              </View>
            </View>
          )}
        </View>
        <Button label={t('map.tooltip.more')} variant="inverse" isFullWidth onPress={onOpen} />
      </View>
      {side === 'above' && arrowView}
      {side === 'above' && gap}
    </Animated.View>
  );
}
