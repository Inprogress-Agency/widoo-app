import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SheetLevel } from './sheet';

interface CoveredBySheetProps {
  /** The detent the results sheet has reached. */
  level: SheetLevel;
  children: ReactNode;
}

/**
 * What the results sheet covers at its full detent, edge to edge under it: the map, its markers
 * and buttons, the search pill and the quick chips. There, they are out of reach of VoiceOver and
 * TalkBack, as they are out of sight; at rest and half, what shows of them is read as before.
 */
export function CoveredBySheet({ level, children }: CoveredBySheetProps) {
  const isCovered = level === 'full';
  return (
    <View
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden={isCovered}
      importantForAccessibility={isCovered ? 'no-hide-descendants' : 'auto'}
    >
      {children}
    </View>
  );
}
