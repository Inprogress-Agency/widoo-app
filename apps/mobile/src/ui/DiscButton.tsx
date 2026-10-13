import type { UiIconKey } from '@widoo/tokens';
import { Pressable } from 'react-native';
import { Icon, uiIcon } from './Icon';

interface DiscButtonProps {
  icon: UiIconKey;
  accessibilityLabel: string;
  onPress: () => void;
  /** White on a photo, warm grey in the bar that replaces it (Ecrans › E-05, défilement). */
  surface?: 'bg' | 'surface';
  isActive?: boolean;
  isDisabled?: boolean;
}

/**
 * Round button of 44 points with an interface icon: close, share and favorite of the route
 * sheet. No text, so nothing to cap; its icon is read through its label.
 */
export function DiscButton({
  icon,
  accessibilityLabel,
  onPress,
  surface = 'bg',
  isActive = false,
  isDisabled = false,
}: DiscButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, selected: isActive }}
      disabled={isDisabled}
      onPress={onPress}
      className={`size-disc items-center justify-center rounded-pill ${surface === 'bg' ? 'bg-bg' : 'bg-surface'}`}
    >
      <Icon {...uiIcon(icon, isActive)} size="icon-m" />
    </Pressable>
  );
}
