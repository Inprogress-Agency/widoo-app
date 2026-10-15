import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { HelpScreen } from './HelpScreen';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

describe('Aide et contact', () => {
  it('opens one question at a time', async () => {
    await render(<HelpScreen />);
    const plan = screen.getByRole('button', { name: 'Comment programmer une sortie ?' });
    await fireEvent.press(plan);
    expect(
      screen.getByRole('button', { name: 'Comment programmer une sortie ?', expanded: true }),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Comment supprimer mon compte ?' }));
    expect(
      screen.getByRole('button', { name: 'Comment programmer une sortie ?', expanded: false }),
    ).toBeTruthy();
    expect(screen.getByText(/tout en bas/)).toBeTruthy();
  });
});

describe('Aide et contact › Nous écrire', () => {
  it('opens the form', async () => {
    await render(<HelpScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Nous écrire' }));
    expect(router.push).toHaveBeenCalledWith('/settings/contact');
  });
});
