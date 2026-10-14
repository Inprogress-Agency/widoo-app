import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { accessibility } from '@widoo/tokens';
import { haptic } from './haptics';
import { ToastHost } from './Toast';
import { showToast, toastStore } from './toastStore';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('./haptics', () => ({ haptic: jest.fn() }));
// The window over the native modals is iOS's own: the toast is drawn in place.
jest.mock('./OverModals', () => ({
  OverModals: ({ children }: { children: unknown }) => children,
}));

async function renderHost() {
  await render(<ToastHost />);
}

describe('Toast', () => {
  beforeEach(() => {
    toastStore.setState({ toast: null, tabBarHeight: 0 });
  });

  it('caps the whole toast at 1.3, below the largest standard setting (D-046)', async () => {
    showToast('error', 'Enregistrement impossible', {
      subtitle: 'Rien n’est perdu.',
      action: { label: 'Réessayer', onPress: () => undefined },
    });
    await renderHost();
    for (const text of ['Enregistrement impossible', 'Rien n’est perdu.', 'Réessayer']) {
      expect(screen.getByText(text).props.maxFontSizeMultiplier).toBe(
        accessibility.maxFontSizeMultiplierDense,
      );
    }
    // At ×1.353, the text stays at ×1.3: the toast is laid out as at the cap, never beyond.
    expect(accessibility.maxFontSizeMultiplierDense).toBeLessThan(accessibility.referenceFontScale);
  });

  it('reads the title and the subtitle as one element, the action apart', async () => {
    const onPress = jest.fn();
    showToast('error', 'Enregistrement impossible', {
      subtitle: 'Rien n’est perdu.',
      action: { label: 'Réessayer', onPress },
    });
    await renderHost();
    expect(
      screen.getByLabelText('Enregistrement impossible. Rien n’est perdu.').props.accessibilityRole,
    ).toBe('alert');
    await fireEvent.press(screen.getByRole('button', { name: 'Réessayer' }));
    expect(haptic).toHaveBeenCalledWith('toastError');
    expect(onPress).toHaveBeenCalledTimes(1);
    // The action closes the toast.
    expect(toastStore.getState().toast).toBeNull();
  });

  it('tells a success without moving the focus, and vibrates (D-030)', async () => {
    toastStore.setState({ tabBarHeight: 90 });
    showToast('success', 'Profil enregistré.', { isAboveTabBar: true });
    await renderHost();
    const status = screen.getByLabelText('Profil enregistré.');
    expect(status.props.accessibilityRole).toBe('text');
    expect(status.props.accessibilityLiveRegion).toBe('polite');
    expect(haptic).toHaveBeenCalledWith('toastSuccess');
  });
});
