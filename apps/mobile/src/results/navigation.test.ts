import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-router', () => ({ router: { push: vi.fn() } }));
vi.mock('../analytics', () => ({ analytics: { track: vi.fn() } }));

const { routeHref } = await import('./navigation');

describe('routeHref', () => {
  it('opens the route sheet at its top', () => {
    expect(routeHref({ id: 'route-1' })).toEqual({
      pathname: '/route/[id]',
      params: { id: 'route-1' },
    });
  });

  it('opens the route sheet at the step of a step tooltip', () => {
    expect(routeHref({ id: 'route-1' }, 3)).toEqual({
      pathname: '/route/[id]',
      params: { id: 'route-1', step: '3' },
    });
  });
});
