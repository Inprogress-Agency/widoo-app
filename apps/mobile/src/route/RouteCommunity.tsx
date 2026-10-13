import type { RouteDetail } from '@widoo/shared';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { formatRating } from '../format/rating';
import { creatorText } from '../results/cardText';
import { Avatar } from '../ui/Avatar';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { parisDay } from './sheetText';

/**
 * The creator box: logo or avatar, name and the blue seal of a certified creator (D-023), its
 * published routes. One element for screen readers. Its profile (E-16) comes with #65.
 */
export function CreatorBox({ route }: { route: RouteDetail }) {
  const { t } = useTranslation();
  const name = route.isOfficial ? 'Widoo' : (route.author?.firstName ?? creatorText(t, route));
  const routes = t('route.creator.routes', { count: route.creator.routesPublished });
  return (
    <View
      accessible
      accessibilityLabel={[name, route.creator.isCertified && t('badges.certified'), routes]
        .filter(Boolean)
        .join(', ')}
      className="flex-row items-center gap-12 rounded-section bg-surface p-16"
    >
      <Avatar
        url={route.author?.avatarUrl ?? null}
        name={name}
        isWidoo={route.isOfficial}
        size="avatar-l"
      />
      <View className="flex-1">
        <View className="flex-row items-center gap-6">
          <Text variant="title-s" className="shrink">
            {name}
          </Text>
          {route.creator.isCertified && <Icon {...uiIcon('certified')} size="icon-s" />}
        </View>
        <Text variant="body-s" color="muted">
          {routes}
        </Text>
      </View>
    </View>
  );
}

/**
 * « Avis »: the average and the count, the last three reviews, each with its initial, first name,
 * date and its rating as a figure after a star (« ★ 5 »), read « note 5 sur 5 ». No reply nor
 * thread. Shown once the route has a review: before, the rating says « Nouveau » (D-023).
 */
export function RouteReviews({ route }: { route: RouteDetail }) {
  const { t } = useTranslation();
  const { average, count } = route.rating;
  if (average === null || count === 0 || route.reviews.length === 0) {
    return null;
  }
  const value = formatRating(average);
  return (
    <View className="gap-12">
      <Text variant="title-l" accessibilityRole="header">
        {t('route.reviews.title')}
      </Text>
      <View
        accessible
        accessibilityLabel={t('route.reviews.summary', { value, count })}
        className="flex-row items-center gap-8 pb-4"
      >
        <Icon {...uiIcon('rating')} size="icon-m" />
        <Text variant="number-m">{value}</Text>
        <Text variant="body-medium" color="muted">
          {t('route.reviews.count', { count })}
        </Text>
      </View>
      {route.reviews.map((review) => {
        const date = parisDay(review.createdAt);
        const spoken = t('route.reviews.item', {
          name: review.firstName,
          date,
          rating: review.rating,
        });
        return (
          <View
            key={review.id}
            accessible
            accessibilityLabel={review.comment ? `${spoken}, ${review.comment}` : spoken}
            className="gap-8 border-t border-line pt-16"
          >
            <View className="flex-row items-center gap-12">
              <Avatar url={null} name={review.firstName} size="avatar-l" />
              <View className="flex-1">
                <Text variant="item">{review.firstName}</Text>
                <Text variant="body-s" color="muted">
                  {date}
                </Text>
              </View>
              <View className="flex-row items-center gap-4">
                <Icon {...uiIcon('rating')} size="icon-s" />
                <Text variant="number-m">{review.rating}</Text>
              </View>
            </View>
            {review.comment && <Text variant="body">{review.comment}</Text>}
          </View>
        );
      })}
    </View>
  );
}
