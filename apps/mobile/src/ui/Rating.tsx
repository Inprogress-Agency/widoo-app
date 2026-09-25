import type { RouteCard } from '@widoo/shared';
import type { ColorToken } from '@widoo/tokens';
import { useTranslation } from 'react-i18next';
import { formatRating } from '../format/rating';
import { View } from 'react-native';
import { Badge } from './Badge';
import { Icon, uiIcon } from './Icon';
import { Text } from './Text';

interface RatingProps {
  rating: RouteCard['rating'];
  /** `number-m` next to a title, `number-s` in a pill. */
  variant?: 'number-m' | 'number-s';
  color?: ColorToken;
}

/** Without review, a route shows « Nouveau » in place of its rating (D-023). */
const isUnrated = (rating: RouteCard['rating']) => rating.average === null || rating.count === 0;

/**
 * Average rating after a yellow star, read « Note 4,9 sur 5 »; the star is decorative, the figure
 * carries the rating. A route without review shows the « Nouveau » badge instead (D-023).
 */
export function Rating({ rating, variant = 'number-s', color = 'ink' }: RatingProps) {
  const { t } = useTranslation();
  if (rating.average === null || isUnrated(rating)) {
    return <Badge kind="new" />;
  }
  const value = formatRating(rating.average);
  return (
    <View
      accessible
      accessibilityLabel={t('rating.label', { value })}
      className="flex-row items-center gap-4"
    >
      <Icon {...uiIcon('must-see')} color="amber" size="space-18" />
      <Text variant={variant} color={color}>
        {value}
      </Text>
    </View>
  );
}

/**
 * The rating as a white pill on a photo (« ★ 4,8 »), or « Nouveau » without review: a dense
 * component, its figure capped at 1.3 times (Direction-Artistique › Pastilles sur photo).
 */
export function RatingPill({ rating }: { rating: RouteCard['rating'] }) {
  const { t } = useTranslation();
  if (rating.average === null || isUnrated(rating)) {
    return <Badge kind="new" />;
  }
  const value = formatRating(rating.average);
  return (
    <View
      accessible
      accessibilityLabel={t('rating.label', { value })}
      className="min-h-badge-h flex-row items-center gap-4 self-start rounded-pill bg-bg px-8"
    >
      <Icon {...uiIcon('must-see')} color="amber" size="space-16" />
      <Text variant="number-s" isDense>
        {value}
      </Text>
    </View>
  );
}
