import { describe, expect, it } from 'vitest';
import { createTtlCache } from './cache';

describe('createTtlCache', () => {
  it('forgets an entry once its time is over', () => {
    let now = 0;
    const cache = createTtlCache<string>({ ttlMs: 10, maxEntries: 5, now: () => now });
    cache.set('a', 'first');
    now = 9;
    expect(cache.get('a')).toBe('first');
    now = 10;
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('drops the oldest entries over its size', () => {
    const cache = createTtlCache<number>({ ttlMs: 1000, maxEntries: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 3);
    cache.set('c', 4);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(3);
    expect(cache.get('c')).toBe(4);
  });
});
