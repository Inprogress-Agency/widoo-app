import { checkAnalyticsEvent } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { newScrollDepths, scrollDepths, type ScrollDepth } from './scrollDepth';

const tops = { info: 700, timeline: 1400, steps: 2600, end: 3200 };

describe('route_scrolled', () => {
  it('tells each depth once, as soon as its top comes into view', () => {
    const reached = new Set<ScrollDepth>();
    expect(newScrollDepths(tops, 844, reached)).toEqual(['info']);
    expect(newScrollDepths(tops, 900, reached)).toEqual([]);
    expect(newScrollDepths(tops, 3300, reached)).toEqual(['timeline', 'steps', 'end']);
    expect(newScrollDepths(tops, 400, reached)).toEqual([]);
  });

  it('waits for a depth whose place is not laid out yet', () => {
    expect(newScrollDepths({ info: 700 }, 5000, new Set())).toEqual(['info']);
  });

  it('sends depths the catalog accepts, without any position', () => {
    for (const depth of scrollDepths) {
      const check = checkAnalyticsEvent('route_scrolled', { route_id: 'route-1', depth });
      expect(check.success).toBe(true);
    }
    expect(
      checkAnalyticsEvent('route_scrolled', { route_id: 'route-1', depth: 'info', offset: 700 })
        .success,
    ).toBe(false);
    expect(checkAnalyticsEvent('route_shared', { route_id: 'route-1' }).success).toBe(true);
  });
});
