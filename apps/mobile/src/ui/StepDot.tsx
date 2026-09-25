import type { PlaceCategory } from '@widoo/shared';
import { activityFamilies, colors, placeCategories } from '@widoo/tokens';
import { View } from 'react-native';
import { Icon } from './Icon';

interface StepDotProps {
  category: PlaceCategory;
  /** Tapped step, or start of a Premium route without subscription: 34 points instead of 28. */
  isActive?: boolean;
}

/**
 * Step dot of the map and the timeline: color of the family and icon of the place category,
 * never the color alone, with a white rim. Decorative: the step it marks carries the label.
 */
export function StepDot({ category, isActive = false }: StepDotProps) {
  const { family, icon } = placeCategories[category];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`${isActive ? 'size-step-dot-active' : 'size-step-dot'} items-center justify-center rounded-pill border-2 border-bg`}
      style={{ backgroundColor: colors[activityFamilies[family].color] }}
    >
      <Icon name={icon} size={isActive ? 'space-18' : 'space-16'} color="on-strong" />
    </View>
  );
}
