import { describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { motion } from '@widoo/tokens';
import { useIsInSight } from './useIsInSight';

// The focus of the screen, driven by the test: the effect runs on focus, its cleanup on blur.
let mockFocus: (() => () => void) | null = null;
jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => () => void) => {
    mockFocus = effect;
  },
}));

describe('useIsInSight', () => {
  it('is out of sight once covered, back in sight when the modal has slid away', async () => {
    jest.useFakeTimers();
    const { result } = await renderHook(() => useIsInSight());
    expect(result.current).toBe(true);
    const blur = await act(() => mockFocus?.());
    await act(() => blur?.());
    expect(result.current).toBe(false);
    await act(() => mockFocus?.());
    expect(result.current).toBe(false);
    await act(() => jest.advanceTimersByTime(motion.durations.page));
    expect(result.current).toBe(true);
    jest.useRealTimers();
  });
});
