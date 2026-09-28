import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RouteCount } from '@widoo/shared';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { api } from '../api/client';
import { resetDiscovery } from '../test/render';
import type { SearchFilters } from './store';
import { useFilterCount } from './useFilterCount';

jest.mock('../analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('../api/client', () => ({ api: { countRoutes: jest.fn() } }));

const countRoutes = api.countRoutes as jest.MockedFunction<typeof api.countRoutes>;

async function renderCount(filters: SearchFilters) {
  // No garbage collection timer, which would outlive the test.
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(({ value }: { value: SearchFilters }) => useFilterCount(value), {
    initialProps: { value: filters },
    wrapper,
  });
}

const wait = (ms: number) =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });

describe('useFilterCount', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetDiscovery();
    countRoutes.mockReset();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('counts at the opening, then 300 ms after the last tap, once, with the breakdown', async () => {
    countRoutes.mockResolvedValue({ count: 9 });
    const { result, rerender } = await renderCount({ moods: ['food'] });
    await wait(0);
    expect(countRoutes).toHaveBeenCalledTimes(1);
    await rerender({ value: { moods: ['food', 'culture'] } });
    await wait(200);
    await rerender({ value: { moods: ['food', 'nature'] } });
    await wait(200);
    expect(countRoutes).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({ status: 'counting' });
    await wait(100);
    expect(countRoutes).toHaveBeenCalledTimes(2);
    expect(countRoutes.mock.calls[1]?.[0]).toMatchObject({
      moods: ['food', 'nature'],
      breakdown: 'all_but_one',
    });
    // The answer comes on the next tick.
    await wait(0);
    expect(result.current).toEqual({ status: 'counted', count: 9, suggestions: [] });
  });

  it('tells the count unavailable after 5 s, and asks again on the next tap', async () => {
    countRoutes.mockImplementationOnce(
      (_params, signal) =>
        new Promise<RouteCount>((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const { result, rerender } = await renderCount({ moods: ['food'] });
    await wait(4_900);
    expect(result.current).toEqual({ status: 'counting' });
    // The abort at 5 s, then its failure through the query, a few ticks later.
    await wait(150);
    expect(result.current).toEqual({ status: 'unavailable' });
    countRoutes.mockResolvedValueOnce({ count: 4 });
    await rerender({ value: { moods: ['food', 'culture'] } });
    await wait(300);
    expect(countRoutes).toHaveBeenCalledTimes(2);
    await wait(50);
    expect(result.current).toEqual({ status: 'counted', count: 4, suggestions: [] });
  });
});
