import { describe, expect, it } from 'vitest';
import { routeShareUrl } from './share';

describe('routeShareUrl', () => {
  it('links to the page of the route on the site', () => {
    expect(routeShareUrl('abc')).toBe('https://widooapp.com/r/abc');
  });

  it('encodes the id', () => {
    expect(routeShareUrl('a b/c')).toBe('https://widooapp.com/r/a%20b%2Fc');
  });
});
