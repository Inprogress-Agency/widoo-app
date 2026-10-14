import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { CalendarStep } from './CalendarStep';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);

describe('CalendarStep', () => {
  it('keeps the days past inactive and tells the day chosen', async () => {
    const onSelect = jest.fn();
    await render(
      <CalendarStep
        selected="2026-10-10"
        today="2026-10-05"
        onSelect={onSelect}
        onBack={jest.fn()}
      />,
    );
    expect(screen.getByRole('header', { name: 'Octobre 2026' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: '10 octobre' }).props.accessibilityState,
    ).toMatchObject({
      selected: true,
    });
    expect(
      screen.getByRole('button', { name: '4 octobre' }).props.accessibilityState,
    ).toMatchObject({
      disabled: true,
    });
    await fireEvent.press(screen.getByRole('button', { name: '24 octobre' }));
    expect(onSelect).toHaveBeenCalledWith('2026-10-24');
    expect(
      screen.getByRole('button', { name: 'Mois précédent' }).props.accessibilityState,
    ).toMatchObject({
      disabled: true,
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Mois suivant' }));
    expect(screen.getByRole('header', { name: 'Novembre 2026' })).toBeTruthy();
  });
});
