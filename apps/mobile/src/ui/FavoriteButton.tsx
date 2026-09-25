import { size } from '@widoo/tokens';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { Icon, uiIcon } from './Icon';

// A 34-point disc: its hit slop brings the touch target to 44 points.
const hitSlop = (size['touch-min'] - size['disc-s']) / 2;

interface FavoriteButtonProps {
  isFavorite?: boolean;
  /** Favorites arrive with accounts (v0.3): until then the disc is shown, and disabled. */
  isDisabled?: boolean;
  onPress?: () => void;
}

/**
 * White disc with the heart, on a card photo: filled coral once in the favorites, never the
 * color alone. A pill on a photo, it has no text to cap.
 */
export function FavoriteButton({
  isFavorite = false,
  isDisabled = false,
  onPress,
}: FavoriteButtonProps) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? t('favorite.remove') : t('favorite.add')}
      accessibilityState={{ disabled: isDisabled, selected: isFavorite }}
      disabled={isDisabled}
      hitSlop={hitSlop}
      onPress={onPress}
      className="size-disc-s items-center justify-center rounded-pill bg-bg"
    >
      <Icon
        {...uiIcon('favorite', isFavorite)}
        size="space-18"
        color={isFavorite ? 'coral' : 'ink'}
      />
    </Pressable>
  );
}
