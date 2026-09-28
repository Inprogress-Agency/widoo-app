import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('gives the value once the taps pause for the delay, never in between', async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'a' } },
    );
    expect(result.current).toBe('a');
    await rerender({ value: 'b' });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    await rerender({ value: 'c' });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    // 400 ms since « b », but only 200 since « c »: still « a ».
    expect(result.current).toBe('a');
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe('c');
  });
});
