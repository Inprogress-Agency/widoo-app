import { labels, type LatLng, type RouteCard as RouteCardData } from '@widoo/shared';
import { colors, filterIcons, motion } from '@widoo/tokens';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { FavoriteButton } from '../ui/FavoriteButton';
import { Icon, uiIcon } from '../ui/Icon';
import { MoodDot } from '../ui/MoodDot';
import { RatingPill } from '../ui/Rating';
import { Tag } from '../ui/Tag';
import { Text } from '../ui/Text';
import { cardText } from './cardText';

/**
 * Height of the card photo, as the maquettes draw it (Ecrans › E-04, planche 1): tokens.json
 * sizes the card, not its photo.
 */
export const CARD_PHOTO_HEIGHT = 150;

/** Height of the photo of a list card, as « Voir tout » draws it (Ecrans › E-04, planche 2). */
export const LIST_CARD_PHOTO_HEIGHT = 190;

/** 270 points in the carousel; in « Voir tout », the width of the list, 358 on a 390 screen. */
export type RouteCardVariant = 'carousel' | 'list';

interface RouteCardProps {
  route: RouteCardData;
  /** The user's position, for the distance tag; null without position: no distance. */
  position: LatLng | null;
  onPress: () => void;
  variant?: RouteCardVariant;
  /** Height of the tallest card of the carousel, which the others take (Accessibilité). */
  minHeight?: number;
  onLayout?: (event: LayoutChangeEvent) => void;
}

/**
 * Route card of the results (Ecrans › E-01, carte de parcours), for the sheet and « Voir tout »:
 * the photo with the rating, Premium, the favorite, Vérifié and Signature; title, mood and place,
 * creator, budget as the key figure, duration and distance, and in a list the public of the
 * route. It grows with the text, never cut; one element for screen readers, with the favorite as
 * an action.
 */
export function RouteCard({
  route,
  position,
  onPress,
  variant = 'carousel',
  minHeight,
  onLayout,
}: RouteCardProps) {
  const { t } = useTranslation();
  const text = cardText(t, route, position);
  const mood = route.moods[0];
  const isList = variant === 'list';
  // The public tag of the list: the first public the creator chose.
  const audience = isList ? route.audiences[0] : undefined;
  const audienceLabel = audience && labels.fr.audiences[audience];

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'favorite') {
      AccessibilityInfo.announceForAccessibility(t('favorite.comingSoon'));
    }
  };

  return (
    <View
      onLayout={onLayout}
      className={isList ? 'self-stretch' : 'w-card-w'}
      style={{ minHeight }}
    >
      <Card
        onPress={onPress}
        accessibilityLabel={audienceLabel ? `${text.label}, ${audienceLabel}` : text.label}
        accessibilityHint={t('card.open')}
        accessibilityActions={[{ name: 'favorite', label: t('favorite.add') }]}
        onAccessibilityAction={handleAccessibilityAction}
        className={`${isList ? 'min-h-card-list-h' : 'min-h-card-h'} flex-1 gap-12 p-8 pb-16`}
      >
        <View
          className="overflow-hidden rounded-photo bg-skeleton"
          style={isList ? styles.listPhoto : styles.photo}
        >
          {route.coverUrl ? (
            <Image
              source={{ uri: route.coverUrl }}
              contentFit="cover"
              transition={motion.durations.fade}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Icon {...uiIcon('map')} size="space-28" color="muted" />
            </View>
          )}
          <View className="absolute inset-x-8 top-8 flex-row items-start gap-6">
            <View className="flex-1 flex-row flex-wrap gap-6">
              <RatingPill rating={route.rating} />
              {route.access === 'premium' && <Badge kind="premium" />}
            </View>
            <FavoriteButton isDisabled />
          </View>
          <View className="absolute bottom-8 left-8 right-8 flex-row flex-wrap gap-6">
            {route.isVerified && <Badge kind="verified" />}
            {route.isOfficial && <Badge kind="signature" />}
          </View>
        </View>
        <View className="gap-6 px-8">
          <Text variant="title-card">{route.title}</Text>
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
        <View className="mt-auto gap-10 px-8">
          <View className="flex-row flex-wrap items-baseline gap-6">
            <Text variant="number-l">{text.budget.amount}</Text>
            {text.budget.perPerson && (
              <Text variant="body-s" color="muted">
                {text.budget.perPerson}
              </Text>
            )}
          </View>
          <View className="flex-row flex-wrap gap-8">
            <Tag icon="duration" label={text.duration.short} />
            {text.distance && <Tag icon="distance" label={text.distance.short} />}
            {audience && audienceLabel && (
              <Tag icon={{ filter: filterIcons.audiences[audience] }} label={audienceLabel} />
            )}
          </View>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { height: CARD_PHOTO_HEIGHT, backgroundColor: colors.skeleton },
  listPhoto: { height: LIST_CARD_PHOTO_HEIGHT, backgroundColor: colors.skeleton },
});
