import { describe, expect, it } from 'vitest';
import { routeAppLink } from './app-links';

describe('routeAppLink', () => {
  it('names the screen of the route in the app', () => {
    expect(routeAppLink('0198c1de-0000-7000-8000-000000000001')).toBe(
      'widoo://route/0198c1de-0000-7000-8000-000000000001',
    );
  });
});
