import { describe, expect, it } from 'vitest';
import { canAccessRoute, type RouteViewer } from './route-access';

const now = new Date('2026-09-29T12:00:00Z');
const free = { id: '0192f0a0-0000-7000-8000-00000000000f', access: 'free' } as const;
const premium = { id: '0192f0a0-0000-7000-8000-00000000000a', access: 'premium' } as const;
const otherPremium = { id: '0192f0a0-0000-7000-8000-00000000000b', access: 'premium' } as const;
const viewer = (
  plan: RouteViewer['plan'],
  planExpiresAt: Date | null,
  unlockedRouteIds: string[] = [],
): RouteViewer => ({ plan, planExpiresAt, unlockedRouteIds: new Set(unlockedRouteIds) });

describe('canAccessRoute', () => {
  it('opens a free route to anyone', () => {
    expect(canAccessRoute(free, null, now)).toBe(true);
    expect(canAccessRoute(free, viewer('free', null), now)).toBe(true);
  });

  it('keeps a Premium route from an anonymous caller and a free account', () => {
    expect(canAccessRoute(premium, null, now)).toBe(false);
    expect(canAccessRoute(premium, viewer('free', null), now)).toBe(false);
    // A leftover end date does not give a free account the right.
    expect(canAccessRoute(premium, viewer('free', new Date('2026-10-29T12:00:00Z')), now)).toBe(
      false,
    );
  });

  it('opens a Premium route to a Premium plan that has not expired', () => {
    expect(canAccessRoute(premium, viewer('premium', new Date('2026-09-29T12:00:01Z')), now)).toBe(
      true,
    );
    expect(canAccessRoute(premium, viewer('premium', null), now)).toBe(true);
  });

  it('keeps a Premium route from a Premium plan expired at or before now', () => {
    expect(canAccessRoute(premium, viewer('premium', now), now)).toBe(false);
    expect(canAccessRoute(premium, viewer('premium', new Date('2026-09-28T12:00:00Z')), now)).toBe(
      false,
    );
  });

  it('opens a Premium route bought alone to its buyer, whatever the plan (D-072, D-073)', () => {
    expect(canAccessRoute(premium, viewer('free', null, [premium.id]), now)).toBe(true);
    expect(canAccessRoute(premium, viewer('premium', now, [premium.id]), now)).toBe(true);
  });

  it('opens only the route bought alone, not another Premium route', () => {
    expect(canAccessRoute(otherPremium, viewer('free', null, [premium.id]), now)).toBe(false);
  });
});
