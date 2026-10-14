import { describe, expect, it } from 'vitest';
import { canSubmitRoute, defaultMaxPendingRoutes, maxPendingRoutesOf } from './moderation';

describe('maxPendingRoutesOf', () => {
  it('reads a positive integer from settings', () => {
    expect(maxPendingRoutesOf(5)).toBe(5);
    expect(maxPendingRoutesOf(1)).toBe(1);
  });

  it.each([undefined, null, 0, -1, 2.5, '3', {}])(
    'falls back to 3 for %s, never to a limit that refuses everything',
    (value) => {
      expect(maxPendingRoutesOf(value)).toBe(defaultMaxPendingRoutes);
    },
  );
});

describe('canSubmitRoute', () => {
  it('lets an account submit while it has fewer routes awaiting moderation than the limit', () => {
    expect(canSubmitRoute(0, 3)).toBe(true);
    expect(canSubmitRoute(2, 3)).toBe(true);
  });

  it('refuses the submission once the limit is reached', () => {
    expect(canSubmitRoute(3, 3)).toBe(false);
    expect(canSubmitRoute(4, 3)).toBe(false);
  });
});
