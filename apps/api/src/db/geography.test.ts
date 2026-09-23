import { pgTable } from 'drizzle-orm/pg-core';
import { afterAll, describe, expect, it } from 'vitest';
import { testConfig } from '../test-config';
import { createSql } from './client';
import { envelopeOf, geographyBBox, geographyPoint, readEwkb } from './geography';

// Hex EWKB returned by PostGIS 3.4 for SRID=4326 geographies.
const point = '0101000020E6100000A835CD3B4ED1024076E09C11A56D4840';
const bigEndianPoint = '0020000001000010e64002d14e3bcd35a840486da5119ce076';
const polygon =
  '0103000020E61000000100000005000000CDCCCCCCCCCC0240CDCCCCCCCC6C4840F6285C8FC2F50240CDCCCCCCCC6C4840' +
  'F6285C8FC2F50240AE47E17A146E4840CDCCCCCCCCCC0240AE47E17A146E4840CDCCCCCCCCCC0240CDCCCCCCCC6C4840';
const lineString =
  '0102000020E610000002000000CDCCCCCCCCCC0240CDCCCCCCCC6C4840F6285C8FC2F50240AE47E17A146E4840';

describe('readEwkb', () => {
  it('reads a point, in either byte order', () => {
    expect(readEwkb(point)).toEqual([[2.3522, 48.8566]]);
    expect(readEwkb(bigEndianPoint)).toEqual([[2.3522, 48.8566]]);
  });

  it('reads the outer ring of a polygon', () => {
    expect(readEwkb(polygon)).toEqual([
      [2.35, 48.85],
      [2.37, 48.85],
      [2.37, 48.86],
      [2.35, 48.86],
      [2.35, 48.85],
    ]);
  });

  it('rejects another shape', () => {
    expect(() => readEwkb(lineString)).toThrow('Unsupported geography type 2');
  });
});

describe('envelopeOf', () => {
  it('bounds the points', () => {
    const points = [
      { lat: 48.8575, lng: 2.3615 },
      { lat: 48.8601, lng: 2.364 },
      { lat: 48.8548, lng: 2.3628 },
    ];
    expect(envelopeOf(points)).toEqual({
      west: 2.3615,
      south: 48.8548,
      east: 2.364,
      north: 48.8601,
    });
  });

  it('refuses an empty list', () => {
    expect(() => envelopeOf([])).toThrow('No point to envelope');
  });
});

describe('geography columns', () => {
  const fixture = pgTable('fixture', {
    point: geographyPoint('point'),
    bbox: geographyBBox('bbox'),
  });
  const sql = createSql(testConfig().databaseUrl);
  afterAll(() => sql.end());

  /** What PostGIS stores and returns for the value the column writes. */
  const throughPostgis = async (ewkt: string) => {
    const [row] = await sql<{ value: string }[]>`select ${ewkt}::geography as value`;
    return row?.value ?? '';
  };

  it('write a point as EWKT, longitude first, and read it back', async () => {
    const paris = { lat: 48.8566, lng: 2.3522 };
    const ewkt = String(fixture.point.mapToDriverValue(paris));
    expect(ewkt).toBe('SRID=4326;POINT(2.3522 48.8566)');
    expect(fixture.point.mapFromDriverValue(await throughPostgis(ewkt))).toEqual(paris);
  });

  it('write an envelope as a closed polygon and read it back', async () => {
    const marais = { west: 2.35, south: 48.85, east: 2.37, north: 48.86 };
    const ewkt = String(fixture.bbox.mapToDriverValue(marais));
    expect(ewkt).toBe(
      'SRID=4326;POLYGON((2.35 48.85, 2.37 48.85, 2.37 48.86, 2.35 48.86, 2.35 48.85))',
    );
    expect(fixture.bbox.mapFromDriverValue(await throughPostgis(ewkt))).toEqual(marais);
  });

  it('refuse coordinates out of range before reaching the database', () => {
    expect(() => fixture.point.mapToDriverValue({ lat: 91, lng: 2 })).toThrow();
    expect(() =>
      fixture.bbox.mapToDriverValue({ west: 2, south: 48, east: 181, north: 49 }),
    ).toThrow();
  });
});
