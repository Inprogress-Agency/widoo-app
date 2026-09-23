import { Pressable, StyleSheet, Text } from 'react-native';
import { a11y, colors, radii, spacing, typography } from '../theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
}

/** Filled blue button. Its height follows the label: 44 points at least. */
export function Button({ label, onPress }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: a11y.minTouchSize,
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    ...typography.label,
    color: colors.onPrimary,
    textAlign: 'center',
  },
});
