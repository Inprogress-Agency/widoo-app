import { accessibility, size, textStyles } from '@widoo/tokens';
import { View } from 'react-native';
import { Text } from './Text';
import { useFontScale } from './useFontScale';

/**
 * Counter of active filters on the filters button (E-01): white number on a blue disc. A dense
 * component: the number is capped at 1.3 times and the disc stays round, as wide as it is high,
 * 26 points at most at 150 %. Decorative: the button says the count.
 */
export function CountBadge({ count }: { count: number }) {
  const scale = Math.min(useFontScale(), accessibility.maxFontSizeMultiplierDense);
  // A minimum size, never a fixed one: the disc still grows if the number needs it.
  const side = Math.max(size['icon-m'], Math.ceil(textStyles['number-s'].lineHeight * scale));
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className="items-center justify-center rounded-pill bg-blue px-4"
      style={{ minWidth: side, minHeight: side }}
    >
      <Text variant="number-s" color="on-blue" isDense>
        {count}
      </Text>
    </View>
  );
}
