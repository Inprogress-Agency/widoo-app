import { describe, expect, it } from 'vitest';
import { createClusterThreshold, defaultClusterAreaKm2 } from './settings';

describe('cluster threshold', () => {
  it('reads settings once a minute', async () => {
    let clock = 0;
    const values: unknown[] = [12, 25];
    let reads = 0;
    const threshold = createClusterThreshold(
      async () => values[reads++],
      () => clock,
    );
    expect(await threshold()).toBe(12);
    clock = 59_999;
    expect(await threshold()).toBe(12);
    clock = 60_000;
    expect(await threshold()).toBe(25);
    expect(reads).toBe(2);
  });

  it.each([
    ['a missing row', undefined],
    ['a negative value', -3],
    ['a string', '40'],
  ])('falls back to the default on %s', async (_, value) => {
    expect(await createClusterThreshold(async () => value)()).toBe(defaultClusterAreaKm2);
  });
});
