import { labels, type RouteCard } from '@widoo/shared';
import { size, spacing } from '@widoo/tokens';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Image, View, findNodeHandle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { formatDuration } from '../format/duration';
import { Button } from '../ui/Button';
import { Icon, uiIcon } from '../ui/Icon';
import { timing } from '../ui/motion';
import { Rating } from '../ui/Rating';
import { Text } from '../ui/Text';
import { useIsLargeText } from '../ui/useIsLargeText';

interface RouteTooltipProps {
  route: RouteCard;
  /** Premium route without subscription: no step is named (D-014). */
  isLocked: boolean;
  /** Position of the arrow along the tooltip, from 0 to 1: it points at the start. */
  arrowAt: number;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * Ink tooltip of a selected route, anchored on its start (Ecrans › E-04): title and rating, the
 * start step, « Voir plus ». Locked, the step line becomes « Parcours Premium » and the number of
 * steps. It fades in, with or without « Réduire les animations », and takes the screen reader
 * focus; the escape gesture closes it. From 130 % of text, only the title and the rating remain.
 */
export function RouteTooltip({ route, isLocked, arrowAt, onOpen, onClose }: RouteTooltipProps) {
  const { t } = useTranslation();
  const isLargeText = useIsLargeText();
  const summary = useRef<View>(null);
  const opacity = useSharedValue(0);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  useEffect(() => {
    opacity.set(withTiming(1, timing('fade', 'fade')));
    const node = findNodeHandle(summary.current);
    if (node !== null) {
      AccessibilityInfo.setAccessibilityFocus(node);
    }
  }, [opacity]);

  const stepCount = route.steps.length;
  const start = route.steps[0];
  const category = start ? labels.fr.placeCategories[start.category] : '';
  const dialogLabel = isLocked
    ? t('map.tooltip.lockedLabel', {
        title: route.title,
        count: stepCount,
        duration: formatDuration(t, route.durationMin, 'spoken'),
      })
    : t('map.tooltip.label', { title: route.title, total: stepCount, place: category });

  return (
    <Animated.View style={fade} className="w-tooltip-w">
      <View
        onAccessibilityEscape={onClose}
        className="gap-12 self-stretch rounded-block bg-surface-strong p-16"
      >
        <View ref={summary} accessible accessibilityLabel={dialogLabel} className="gap-12">
          {/* At large text sizes, the rating moves under the title, which keeps the full width. */}
          <View className={isLargeText ? 'items-start gap-8' : 'flex-row items-start gap-8'}>
            <Text
              variant="title-s"
              color="on-strong"
              // Two lines at most, but never cut at large text sizes: it is then all the tooltip.
              numberOfLines={isLargeText ? undefined : 2}
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
                    <Icon {...uiIcon('premium')} size="space-18" />
                    <Text variant="item" color="on-strong">
                      {t('map.tooltip.premium')}
                    </Text>
                  </View>
                ) : (
                  <Text variant="item" color="on-strong">
                    {category}
                  </Text>
                )}
                <Text variant="body-s" color="on-strong-muted">
                  {isLocked
                    ? t('map.tooltip.steps', {
                        count: stepCount,
                        duration: formatDuration(t, route.durationMin, 'short'),
                      })
                    : t('map.tooltip.step', { total: stepCount })}
                </Text>
              </View>
            </View>
          )}
        </View>
        <Button label={t('map.tooltip.more')} variant="inverse" isFullWidth onPress={onOpen} />
      </View>
      <View
        className="-mt-6 size-12 rotate-45 bg-surface-strong"
        // Centred on its share of the width: the arrow points at the start.
        style={{ marginLeft: arrowAt * size['tooltip-w'] - spacing['space-12'] / 2 }}
      />
      {/* The tooltip points at the start dot, not into it. */}
      <View style={{ height: size['step-dot-active'] / 2 }} />
    </Animated.View>
  );
}
