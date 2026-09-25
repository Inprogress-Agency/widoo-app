import type { RouteCard } from '@widoo/shared';
import type { ColorToken } from '@widoo/tokens';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Badge } from './Badge';
import { Icon, uiIcon } from './Icon';
import { Text } from './Text';

const ratingFormat = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

interface RatingProps {
  rating: RouteCard['rating'];
  /** `number-m` next to a title, `number-s` in a pill. */
  variant?: 'number-m' | 'number-s';
  color?: ColorToken;
}

/**
 * Average rating after a yellow star, read « Note 4,9 sur 5 »; the star is decorative, the figure
 * carries the rating. A route without review shows the « Nouveau » badge instead (D-023).
 */
export function Rating({ rating, variant = 'number-s', color = 'ink' }: RatingProps) {
  const { t } = useTranslation();
  if (rating.average === null || rating.count === 0) {
    return <Badge kind="new" />;
  }
  const value = ratingFormat.format(rating.average);
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
