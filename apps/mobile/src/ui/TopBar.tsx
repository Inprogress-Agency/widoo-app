import { size, spacing } from '@widoo/tokens';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, uiIcon } from './Icon';
import { Text } from './Text';

// A text action is shorter than a finger: its hit slop brings it to 44 points.
const hitSlop = size['touch-min'] / 4;

/** A text action of the bar: « Annuler », « Enregistrer ». */
export interface TopBarAction {
  label: string;
  onPress: () => void;
  /** What a screen reader says when it differs: « Enregistrer le profil ». */
  accessibilityLabel?: string;
  isDisabled?: boolean;
  /** The request it sent is under way: announced busy, and not pressed twice. */
  isBusy?: boolean;
}

interface TopBarProps {
  title: string;
  /** A back disc on the left (Réglages, Supprimer mon compte), its label for screen readers. */
  back?: { label: string; onPress: () => void };
  /** Text actions instead (Modifier le profil): « Annuler » on the left, « Enregistrer » on the right. */
  leading?: TopBarAction;
  trailing?: TopBarAction;
}

/**
 * Top bar of the secondary pages (Ecrans › E-09: Modifier le profil, Réglages, Supprimer mon
 * compte): a dense component, its text capped at 1.3 times. Actions at their width, the title
 * centred between them, on two lines when needed; a hairline under it. Under the status bar.
 */
export function TopBar({ title, back, leading, trailing }: TopBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row items-center gap-12 border-b border-line bg-bg px-16 pb-8"
      // Safe area measured at runtime.
      style={{ paddingTop: insets.top + spacing['space-8'] }}
    >
      <View className="min-w-touch-min flex-row justify-start">
        {back && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={back.label}
            onPress={back.onPress}
            className="size-disc items-center justify-center rounded-pill bg-surface"
          >
            <Icon {...uiIcon('back')} size="icon-m" />
          </Pressable>
        )}
        {leading && <BarAction action={leading} color="ink" />}
      </View>
      <Text
        variant="title-s"
        accessibilityRole="header"
        isDense
        numberOfLines={2}
        className="flex-1 text-center"
      >
        {title}
      </Text>
      <View className="min-w-touch-min flex-row justify-end">
        {trailing && <BarAction action={trailing} color="blue" />}
      </View>
    </View>
  );
}

function BarAction({ action, color }: { action: TopBarAction; color: 'ink' | 'blue' }) {
  const isInactive = action.isDisabled === true || action.isBusy === true;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.accessibilityLabel ?? action.label}
      accessibilityState={{ disabled: isInactive, busy: action.isBusy === true }}
      disabled={isInactive}
      hitSlop={hitSlop}
      onPress={action.onPress}
      className="min-h-touch-min justify-center"
    >
      <Text
        variant={color === 'blue' ? 'button' : 'body-medium'}
        color={isInactive ? 'muted' : color}
        isDense
      >
        {action.label}
      </Text>
    </Pressable>
  );
}
