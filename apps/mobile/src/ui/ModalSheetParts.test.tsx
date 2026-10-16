import { describe, expect, it, jest } from '@jest/globals';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { render } from '@testing-library/react-native';
import type { AccessibilityProps } from 'react-native';
import { ModalSheetBackdrop } from './ModalSheetParts';

// The veil of gorhom, replaced by a recorder of what it is given: the mock of the library has
// none, and its defaults, which this test is about, apply to an undefined prop, not to null.
const veilProps: (AccessibilityProps & { pressBehavior?: unknown })[] = [];
jest.mock('@gorhom/bottom-sheet', () => ({
  useBottomSheet: () => ({ close: jest.fn() }),
  BottomSheetBackdrop: (props: AccessibilityProps) => {
    veilProps.push(props);
    return null;
  },
}));

const sheetProps = { animatedIndex: {}, animatedPosition: {} } as BottomSheetBackdropProps;

describe('ModalSheetBackdrop', () => {
  it('is a button that says what it closes', async () => {
    await render(<ModalSheetBackdrop {...sheetProps} closeLabel="Fermer le tri" />);
    expect(veilProps.at(-1)).toMatchObject({
      accessible: true,
      accessibilityLabel: 'Fermer le tri',
      accessibilityRole: 'button',
      pressBehavior: 'none',
    });
  });

  it('is nothing for a screen reader when it closes nothing (E-18)', async () => {
    await render(<ModalSheetBackdrop {...sheetProps} closeLabel="" pressBehavior="none" />);
    expect(veilProps.at(-1)).toMatchObject({
      accessible: false,
      accessibilityLabel: null,
      accessibilityRole: null,
    });
  });
});
