import type { RouteDetail, RouteReview } from '@widoo/shared';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { formatRating } from '../format/rating';
import { creatorText } from '../results/cardText';
import { Avatar } from '../ui/Avatar';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { TextLink } from '../ui/TextLink';
import { parisDay } from './sheetText';

/**
 * The creator box: logo or avatar, name and the blue seal of a certified creator (D-023), its
 * published routes, read as one element, and « Voir le profil » to its public profile (E-16). A
 * creator that is not public reads « Membre Widoo », without link.
 */
export function CreatorBox({
  route,
  onOpenCreator,
}: {
  route: RouteDetail;
  onOpenCreator?: (author: NonNullable<RouteDetail['author']>) => void;
}) {
  const { t } = useTranslation();
  const name = route.isOfficial ? 'Widoo' : (route.author?.firstName ?? creatorText(t, route));
  const routes = t('route.creator.routes', { count: route.creator.routesPublished });
  const author = route.isOfficial ? null : route.author;
  return (
    <View className="gap-12 rounded-section bg-surface p-16">
      <View
        accessible
        accessibilityLabel={[name, route.creator.isCertified && t('badges.certified'), routes]
          .filter(Boolean)
          .join(', ')}
        className="flex-row items-center gap-12"
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
      {author && onOpenCreator && (
        <TextLink
          label={t('creator.seeProfile')}
          accessibilityLabel={t('creator.seeProfileOf', { name: author.firstName })}
          color="blue-ink"
          onPress={() => onOpenCreator(author)}
        />
      )}
    </View>
  );
}

/**
 * A review: initial, first name, date and its rating as a figure after a star (« ★ 5 »), then its
 * comment, read as one element « Camille, 17 sept., note 5 sur 5 ». No reply nor thread.
 */
export function ReviewItem({ review }: { review: RouteReview }) {
  const { t } = useTranslation();
  const date = parisDay(review.createdAt);
  const spoken = t('route.reviews.item', { name: review.firstName, date, rating: review.rating });
  return (
    <View
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
}

/**
 * « Avis »: the average and the count, the last three reviews, each with its initial, first name,
 * date and its rating as a figure after a star (« ★ 5 »), read « note 5 sur 5 ». No reply nor
 * thread, then « Voir les 128 avis » when there are more. Shown once the route has a review:
 * before, the rating says « Nouveau » (D-023).
 */
export function RouteReviews({
  route,
  onOpenReviews,
}: {
  route: RouteDetail;
  /** « Voir les 128 avis », to every review of the route. */
  onOpenReviews?: (routeId: string) => void;
}) {
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
      {route.reviews.map((review) => (
        <ReviewItem key={review.id} review={review} />
      ))}
      {onOpenReviews && count > route.reviews.length && (
        <TextLink
          label={t('route.reviews.all', { count })}
          onPress={() => onOpenReviews(route.id)}
        />
      )}
    </View>
  );
}
