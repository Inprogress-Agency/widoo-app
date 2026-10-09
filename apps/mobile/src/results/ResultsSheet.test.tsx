import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, type AccessibilityRole } from 'react-native';
import { ResultsSheet } from './ResultsSheet';

interface SheetAccessibilityProps {
  children?: ReactNode;
  accessible?: boolean | null;
  accessibilityLabel?: string | null;
  accessibilityRole?: AccessibilityRole | null;
}

// The content view of @gorhom/bottom-sheet, with its accessibility defaults: a prop left out
// takes « Bottom Sheet » and « adjustable », a prop of null sets nothing.
jest.mock('@gorhom/bottom-sheet', () => {
  const mock = jest.requireActual<Record<string, unknown>>('@gorhom/bottom-sheet/mock');
  const { View: SheetView } = jest.requireActual<typeof import('react-native')>('react-native');
  function BottomSheet({
    children,
    accessible = true,
    accessibilityLabel = 'Bottom Sheet',
    accessibilityRole = 'adjustable',
  }: SheetAccessibilityProps) {
    return (
      <SheetView
        testID="sheet-content"
        accessible={accessible ?? undefined}
        accessibilityLabel={accessibilityLabel ?? undefined}
        accessibilityRole={accessibilityRole ?? undefined}
      >
        {children}
      </SheetView>
    );
  }
  return { ...mock, __esModule: true, default: BottomSheet };
});
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);

describe('ResultsSheet', () => {
  it('gives the screen reader its content, never the English label of the library', async () => {
    await render(
      <ResultsSheet containerHeight={800} peek={<Text>À proximité</Text>}>
        <Pressable accessibilityRole="button" accessibilityLabel="Canal Saint-Martin">
          <Text>Canal Saint-Martin</Text>
        </Pressable>
      </ResultsSheet>,
    );
    expect(screen.queryByLabelText('Bottom Sheet')).toBeNull();
    const content = screen.getByTestId('sheet-content');
    expect(content.props.accessible).toBe(false);
    expect(content.props.accessibilityLabel).toBeUndefined();
    expect(content.props.accessibilityRole).toBeUndefined();
    // The handle stays the one adjustable element, the cards stay read.
    expect(screen.getAllByRole('adjustable')).toHaveLength(1);
    expect(screen.getByRole('adjustable', { name: 'Résultats' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Canal Saint-Martin' })).toBeOnTheScreen();
    expect(screen.getByText('À proximité')).toBeOnTheScreen();
  });
});
