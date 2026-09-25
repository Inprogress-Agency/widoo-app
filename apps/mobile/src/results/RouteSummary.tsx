import type { LatLng, RouteCard } from '@widoo/shared';
import { motion } from '@widoo/tokens';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Icon, uiIcon } from '../ui/Icon';
import { MoodDot } from '../ui/MoodDot';
import { Rating } from '../ui/Rating';
import { Tag } from '../ui/Tag';
import { Text } from '../ui/Text';
import { useIsLargeText } from '../ui/useIsLargeText';
import { cardText } from './cardText';

// The summary replaces the section in a fade (M-07), kept with « Réduire les animations ».
const summaryFade = FadeIn.duration(motion.durations.fade).reduceMotion(ReduceMotion.Never);

interface RouteSummaryProps {
  route: RouteCard;
  position: LatLng | null;
  /** « Voir le parcours »: the route sheet, locked for a Premium route without subscription. */
  onOpen: () => void;
}

/**
 * Summary of the route selected on the map, in the sheet at rest (Ecrans › E-04, tap sur un
 * parcours): photo, title, mood and place, creator, rating, budget, duration and distance, and
 * « Voir le parcours ». From 130 % of text, the button comes up under the title and the creator,
 * the budget and the tags follow in `RouteSummaryMore` (the second reflow of Accessibilité).
 */
export function RouteSummary({ route, position, onOpen }: RouteSummaryProps) {
  const { t } = useTranslation();
  const isLargeText = useIsLargeText();
  const text = cardText(t, route, position);
  const mood = route.moods[0];

  const button = <Button label={t('summary.open')} onPress={onOpen} isFullWidth />;

  return (
    <Animated.View entering={summaryFade} className="gap-16 px-16 pb-16">
      <View
        accessible
        accessibilityLabel={t('summary.label', { card: text.label })}
        className="flex-row items-start gap-12"
      >
        <View className="size-marker items-center justify-center overflow-hidden rounded-photo bg-skeleton">
          {route.coverUrl ? (
            <Image
              source={{ uri: route.coverUrl }}
              contentFit="cover"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <Icon {...uiIcon('map')} color="muted" />
          )}
        </View>
        <View className="flex-1 gap-4">
          <Text variant="title-s">{route.title}</Text>
          {text.place !== '' && (
            <View className="flex-row items-center gap-6">
              {mood && <MoodDot mood={mood} />}
              <Text variant="body-s" color="muted" className="shrink">
                {text.place}
              </Text>
            </View>
          )}
          <View className="flex-row items-center gap-8">
            <Avatar
              url={route.author?.avatarUrl ?? null}
              name={route.isOfficial ? 'Widoo' : (route.author?.firstName ?? 'Widoo')}
              isWidoo={route.isOfficial}
            />
            <Text variant="body-s" color="muted" className="shrink">
              {text.creator}
            </Text>
          </View>
        </View>
        <View className="rounded-pill bg-surface px-10 py-4">
          <Rating rating={route.rating} />
        </View>
      </View>
      {!isLargeText && <SummaryDetails route={route} position={position} />}
      {button}
    </Animated.View>
  );
}

/**
 * Budget, duration and distance of the summary: under « Voir le parcours » from 130 % of text,
 * where the sheet scrolls to them, the rest detent keeping the map and its tooltip in view.
 */
export function RouteSummaryMore({ route, position }: Omit<RouteSummaryProps, 'onOpen'>) {
  const isLargeText = useIsLargeText();
  if (!isLargeText) {
    return null;
  }
  return (
    <View className="px-16 pb-16">
      <SummaryDetails route={route} position={position} />
    </View>
  );
}

function SummaryDetails({ route, position }: Omit<RouteSummaryProps, 'onOpen'>) {
  const { t } = useTranslation();
  const text = cardText(t, route, position);
  return (
    // Read with the summary above: hidden here, so that nothing is read twice.
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="flex-row flex-wrap items-center gap-8"
    >
      <View className="flex-1 flex-row flex-wrap items-baseline gap-6">
        <Text variant="number-l">{text.budget.amount}</Text>
        {text.budget.perPerson && (
          <Text variant="body-s" color="muted">
            {text.budget.perPerson}
          </Text>
        )}
      </View>
      <Tag icon="duration" label={text.duration.short} surface="surface" />
      {text.distance && <Tag icon="distance" label={text.distance.short} surface="surface" />}
    </View>
  );
}
