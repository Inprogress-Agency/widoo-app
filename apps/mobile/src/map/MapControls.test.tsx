import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { accessibility, motion } from '@widoo/tokens';
import { SearchingPill, SearchZoneButton } from './MapControls';

describe('SearchZoneButton', () => {
  it('is a button that runs the search of the zone', async () => {
    const onPress = jest.fn();
    await render(<SearchZoneButton onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Rechercher dans cette zone' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('caps its label at 1.3 times, as a dense pill', async () => {
    await render(<SearchZoneButton onPress={() => {}} />);
    expect(screen.getByText('Rechercher dans cette zone').props.maxFontSizeMultiplier).toBe(
      accessibility.maxFontSizeMultiplierDense,
    );
  });
});

describe('SearchingPill', () => {
  it('caps its label at 1.3 times, as the button it replaces', async () => {
    jest.useFakeTimers();
    await render(<SearchingPill isSearching />);
    await act(() => jest.advanceTimersByTime(motion.durations.loadingDelay));
    expect(screen.getByText('Recherche…').props.maxFontSizeMultiplier).toBe(
      accessibility.maxFontSizeMultiplierDense,
    );
    jest.useRealTimers();
  });
});
