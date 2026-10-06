import { describe, expect, it } from 'vitest';
import { GeocodeQuery, GeocodeZone } from './schemas/geocode';
import { zoneMinSpanM, zoneSearchBox } from './zone';

const center = { lat: 48.8867, lng: 2.3431 };
const metersPerDegree = 111_195;
const widthM = (b: { west: number; east: number }, lat: number) =>
  (b.east - b.west) * metersPerDegree * Math.cos((lat * Math.PI) / 180);
const heightM = (b: { south: number; north: number }) => (b.north - b.south) * metersPerDegree;

describe('zoneSearchBox', () => {
  it('gives a station, without envelope, the 3 km around it', () => {
    const box = zoneSearchBox(center, null);
    expect(widthM(box, center.lat)).toBeCloseTo(zoneMinSpanM, 0);
    expect(heightM(box)).toBeCloseTo(zoneMinSpanM, 0);
    expect((box.west + box.east) / 2).toBeCloseTo(center.lng, 9);
    expect((box.south + box.north) / 2).toBeCloseTo(center.lat, 9);
  });

  it('widens a small neighbourhood to 3 km on each side', () => {
    const envelope = { west: 2.335, south: 48.882, east: 2.35, north: 48.89 };
    const box = zoneSearchBox(center, envelope);
    expect(widthM(box, center.lat)).toBeGreaterThanOrEqual(zoneMinSpanM - 1);
    expect(heightM(box)).toBeGreaterThanOrEqual(zoneMinSpanM - 1);
    expect(box.west).toBeLessThanOrEqual(envelope.west);
    expect(box.north).toBeGreaterThanOrEqual(envelope.north);
  });

  it('keeps the envelope of a large zone as it is', () => {
    const paris = { west: 2.2241, south: 48.8156, east: 2.4699, north: 48.9022 };
    expect(zoneSearchBox({ lat: 48.8566, lng: 2.3522 }, paris)).toEqual(paris);
  });
});

describe('GeocodeQuery', () => {
  it('trims the text', () => {
    expect(GeocodeQuery.parse({ q: '  Montmartre ' })).toEqual({ q: 'Montmartre' });
  });

  it.each([
    ['a single character', { q: 'a' }],
    ['over 100 characters', { q: 'a'.repeat(101) }],
    ['markup', { q: '<script>' }],
    ['a control character', { q: 'canal\u0000' }],
    ['an unknown key', { q: 'canal', types: 'address' }],
  ])('refuses %s', (_, query) => {
    expect(GeocodeQuery.safeParse(query).success).toBe(false);
  });
});

describe('GeocodeZone', () => {
  const zone = {
    id: 'dXJuOm1ieHBsYzpGaWN0aWY',
    name: 'Quartier fictif',
    kind: 'neighborhood',
    area: 'Paris 18e',
    center,
    bbox: zoneSearchBox(center, null),
    routeCount: 3,
  };

  it('accepts a zone', () => {
    expect(GeocodeZone.parse(zone)).toEqual(zone);
  });

  it('refuses an address, which is not a zone', () => {
    expect(GeocodeZone.safeParse({ ...zone, kind: 'address' }).success).toBe(false);
  });

  it('refuses an envelope whose west is east of its east', () => {
    const bbox = { west: 2.4, south: 48.8, east: 2.3, north: 48.9 };
    expect(GeocodeZone.safeParse({ ...zone, bbox }).success).toBe(false);
  });
});
