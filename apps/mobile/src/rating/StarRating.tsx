import { ratingValues } from '@widoo/shared';
import { colors, size } from '@widoo/tokens';
import { icons } from '@widoo/tokens/icons';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { haptic } from '../ui/haptics';
import { ratingLabel } from './endText';

/**
 * Stars of 40 points in zones of 52 (Ecrans › E-15): the side the planche sets, which the size
 * tokens do not carry; the zone is the height of a large button.
 */
const STAR_SIZE = 40;
const StarIcon = icons.star;

interface StarRatingProps {
  /** The rating chosen, from 1 to 5, or null before. */
  value: number | null;
  onChange: (value: number) => void;
  /** « Votre note », the name of the group for a screen reader. */
  label: string;
}

/**
 * « Votre note »: five stars in a radio group, full in amber up to the one chosen, outlined in
 * `control-border` otherwise, never a plain grey (D-034). Each one reads « 4 sur 5, Très bien »
 * and ticks under the finger (`ratingStar`).
 */
export function StarRating({ value, onChange, label }: StarRatingProps) {
  const { t } = useTranslation();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      className="flex-row justify-center"
    >
      {ratingValues.map((star) => {
        const isFull = value !== null && star <= value;
        return (
          <Pressable
            key={star}
            accessibilityRole="radio"
            accessibilityLabel={t('go.end.rating.star', {
              value: star,
              label: ratingLabel(t, star),
            })}
            accessibilityState={{ checked: star === value }}
            onPress={() => {
              haptic('ratingStar');
              onChange(star);
            }}
            className="items-center justify-center"
            style={{ width: size['button-l-h'], height: size['button-l-h'] }}
          >
            <StarIcon
              size={STAR_SIZE}
              weight={isFull ? 'fill' : 'regular'}
              color={isFull ? colors.amber : colors['control-border']}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
