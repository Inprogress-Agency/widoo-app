import { spacing } from '@widoo/tokens';
import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Bar stuck to the bottom of a screen, above the home indicator: its buttons share the width in
 * equal parts and stay side by side at large text sizes, their labels in `Button isDense`
 * (Ecrans › E-05, barre collée). Read last, after the content.
 */
export function StickyBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row gap-12 border-line bg-bg px-16 pt-12"
      style={[styles.border, { paddingBottom: Math.max(insets.bottom, spacing['space-12']) }]}
    >
      {Children.map(children, (child) => (
        <View className="flex-1 justify-center">{child}</View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  border: { borderTopWidth: StyleSheet.hairlineWidth },
});
