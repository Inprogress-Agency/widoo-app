import { describe, expect, it } from 'vitest';
import { decideRouting, type RoutingInput } from './routing';

const request: RoutingInput = {
  host: 'widoo.example',
  pathname: '/',
  search: '',
  acceptLanguage: null,
  siteUrl: 'https://widoo.example',
  aliasHosts: ['www.widoo.example', 'old.example'],
};

describe('decideRouting', () => {
  it('moves an alias host to the canonical site, path and query kept', () => {
    expect(
      decideRouting({ ...request, host: 'WWW.widoo.example', pathname: '/en', search: '?src=qr' }),
    ).toEqual({
      kind: 'redirect',
      location: 'https://widoo.example/en?src=qr',
      status: 308,
      negotiated: false,
    });
  });

  it('ignores the port of the host', () => {
    expect(decideRouting({ ...request, host: 'old.example:443' })).toMatchObject({
      status: 308,
    });
  });

  it('sends the home page to the language of the browser, query kept', () => {
    expect(decideRouting({ ...request, acceptLanguage: 'en-US,en;q=0.9' })).toEqual({
      kind: 'redirect',
      location: '/en',
      status: 307,
      negotiated: true,
    });
    expect(decideRouting({ ...request, search: '?src=flyer' })).toMatchObject({
      location: '/fr?src=flyer',
    });
  });

  it('serves a page with a language prefix as is', () => {
    expect(decideRouting({ ...request, pathname: '/fr' })).toEqual({ kind: 'next' });
    expect(decideRouting({ ...request, pathname: '/en/terms' })).toEqual({ kind: 'next' });
  });

  it('serves any other path in the language of the browser, address unchanged', () => {
    expect(decideRouting({ ...request, pathname: '/nothing', acceptLanguage: 'en' })).toEqual({
      kind: 'rewrite',
      pathname: '/en/nothing',
    });
    expect(decideRouting({ ...request, pathname: '/french' })).toEqual({
      kind: 'rewrite',
      pathname: '/fr/french',
    });
  });

  it('does not take a path that only starts like a language for a prefix', () => {
    expect(decideRouting({ ...request, pathname: '/fresh' })).toMatchObject({ kind: 'rewrite' });
  });
});
