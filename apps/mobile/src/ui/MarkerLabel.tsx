import { size } from '@widoo/tokens';
import { View } from 'react-native';
import { Text } from './Text';

/**
 * Duration label of a map marker (« 7 h »): white pill in `number-s`. A dense component, its text
 * capped at 1.3 times, here and nowhere else (Direction-Artistique › Accessibilité).
 */
export function MarkerLabel({ label }: { label: string }) {
  return (
    <View
      className="min-h-badge-h justify-center self-center bg-bg px-10"
      // A pill whose radius is half its height: the map pictures the view, and drops the corners
      // of the 999 radius of `rounded-pill`.
      style={{ borderRadius: size['badge-h'] / 2 }}
    >
      <Text variant="number-s" isDense>
        {label}
      </Text>
    </View>
  );
}
