import { describe, expect, it } from 'vitest';
import {
  appDownloadTarget,
  appRouteLink,
  detectPlatform,
  readSource,
  storeLinkFor,
} from './store-links';

const stores = {
  appStoreUrl: 'https://apps.example/widoo',
  playStoreUrl: 'https://play.example/store/apps/details?id=app.widoo',
};

describe('readSource', () => {
  it('keeps a short source, lowercased', () => {
    expect(readSource('QR_Airbnb-12')).toBe('qr_airbnb-12');
  });

  it('drops an empty, long or unexpected source', () => {
    expect(readSource(undefined)).toBeUndefined();
    expect(readSource('')).toBeUndefined();
    expect(readSource('a'.repeat(41))).toBeUndefined();
    expect(readSource('<script>')).toBeUndefined();
  });
});

describe('detectPlatform', () => {
  it('recognizes the phones', () => {
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 15; Pixel 9)')).toBe('android');
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)')).toBe('ios');
  });

  it('takes a Mac with a touch screen for an iPad', () => {
    const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)';
    expect(detectPlatform(mac, 5)).toBe('ios');
    expect(detectPlatform(mac, 0)).toBe('desktop');
  });
});

describe('appRouteLink', () => {
  it('opens the route in the app, with the token of a private link', () => {
    expect(appRouteLink('widoo', 'abc')).toBe('widoo://route/abc');
    expect(appRouteLink('widoo', 'abc', 't0k/en')).toBe('widoo://route/abc?token=t0k%2Fen');
  });
});

describe('storeLinkFor', () => {
  it('sends an iPhone to the App Store', () => {
    expect(storeLinkFor('ios', stores, { routeId: 'abc', source: 'qr' })).toBe(
      'https://apps.example/widoo',
    );
  });

  it('carries the route and the source to Google Play in the install referrer', () => {
    const link = new URL(storeLinkFor('android', stores, { routeId: 'abc', source: 'qr' }) ?? '');
    expect(link.searchParams.get('id')).toBe('app.widoo');
    expect(link.searchParams.get('referrer')).toBe('route=abc&src=qr');
  });

  it('gives no store to a computer, nor when the store is not configured', () => {
    expect(storeLinkFor('desktop', stores)).toBeUndefined();
    expect(storeLinkFor('android', {})).toBeUndefined();
  });
});

describe('appDownloadTarget', () => {
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)';
  const android = 'Mozilla/5.0 (Linux; Android 15; Pixel 9)';
  const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6)';

  it('opens the store of the phone', () => {
    expect(appDownloadTarget(iphone, stores, '/fr')).toBe(stores.appStoreUrl);
    expect(appDownloadTarget(android, stores, '/fr')).toBe(stores.playStoreUrl);
  });

  it('passes the source to Google Play', () => {
    expect(appDownloadTarget(android, stores, '/fr', 'flyer-abbesses')).toBe(
      'https://play.example/store/apps/details?id=app.widoo&referrer=src%3Dflyer-abbesses',
    );
  });

  it('sends a computer, or a phone without store link, to the home page', () => {
    expect(appDownloadTarget(mac, stores, '/en')).toBe('/en');
    expect(appDownloadTarget(iphone, {}, '/fr')).toBe('/fr');
  });
});
