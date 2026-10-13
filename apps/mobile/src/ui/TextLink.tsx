import { size, type ColorToken, type UiIconKey } from '@widoo/tokens';
import { Pressable } from 'react-native';
import { Icon, uiIcon } from './Icon';
import { Text } from './Text';

// The link text is shorter than a finger: its hit slop brings it to 44 points.
const hitSlop = size['touch-min'] / 4;

interface TextLinkProps {
  label: string;
  onPress: () => void;
  /** What a screen reader says when it differs: « Voir l'étape Café Lomi ». */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** `link` leads elsewhere, `button` acts in place (« Lire la suite », « Réessayer »). */
  role?: 'link' | 'button';
  icon?: UiIconKey;
  /** Blue on white (4.51:1), blue ink on warm grey (6.72:1, Direction-Artistique › Couleurs). */
  color?: Extract<ColorToken, 'blue' | 'blue-ink'>;
}

/** A blue text link of the route sheet: « Lire la suite », « Voir sur la carte », « Réessayer ». */
export function TextLink({
  label,
  onPress,
  accessibilityLabel = label,
  accessibilityHint,
  role = 'link',
  icon,
  color = 'blue',
}: TextLinkProps) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      hitSlop={hitSlop}
      onPress={onPress}
      className="flex-row items-center gap-6 self-start"
    >
      {icon && <Icon {...uiIcon(icon)} size="icon-m" color={color} />}
      <Text variant="button" color={color} className="shrink">
        {label}
      </Text>
    </Pressable>
  );
}
