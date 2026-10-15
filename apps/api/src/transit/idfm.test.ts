import { describe, expect, it } from 'vitest';
import { datasetOf, idfmLicence, MIN_STATIONS, serializeDataset, stationsOf } from './idfm';
import { TransitDataset, transitDataset } from './stations';

/** Records shaped like the export, with fields the import drops. */
const record = (zone: number, name: string, resCom: string, mode: string, lat = 48.86) => ({
  id_ref_zdc: zone,
  nom_gares: name,
  res_com: resCom,
  mode,
  geo_point_2d: { lat, lon: 2.34 },
  exploitant: 'RATP',
  picto: { url: 'https://example.com/picto.svg' },
});

const meta = (license = idfmLicence) => ({
  metas: { default: { license, modified: '2025-12-10T14:10:02+00:00' } },
});

describe('stationsOf', () => {
  it('groups the lines of a connection zone, metro first, in their natural order', () => {
    const stations = stationsOf([
      record(2, 'Gare du Nord', 'RER B', 'RER'),
      record(2, 'Gare du Nord', 'METRO 5', 'METRO'),
      record(2, 'Gare du Nord', 'METRO 4', 'METRO', 48.861),
      record(2, 'Gare du Nord', 'RER B', 'RER'),
      record(1, 'Porte de Versailles', 'TRAM 3a', 'TRAMWAY'),
      record(1, 'Porte de Versailles', 'METRO 12', 'METRO'),
    ]);
    expect(stations.map((station) => station.id)).toEqual(['1', '2']);
    expect(stations[0]?.lines).toEqual([
      { mode: 'metro', line: '12' },
      { mode: 'tram', line: '3a' },
    ]);
    expect(stations[1]?.lines.map((line) => line.line)).toEqual(['4', '5', 'B']);
    expect(stations[1]?.stops).toEqual([
      { name: 'Gare du Nord', lat: 48.86, lng: 2.34 },
      { name: 'Gare du Nord', lat: 48.861, lng: 2.34 },
    ]);
  });

  it('keeps the metro, the RER and the tram only, and cleans invisible characters', () => {
    const stations = stationsOf([
      record(1, 'Porte de Champerret\u200b', 'METRO 3', 'METRO'),
      record(2, 'Juvisy', 'TRAIN R', 'TRAIN'),
      record(3, 'Orly', 'VAL ORLYVAL', 'VAL'),
      record(4, 'Tram 14', 'TRAM 14', 'TRAM'),
    ]);
    expect(stations.map((station) => station.stops[0]?.name)).toEqual([
      'Porte de Champerret',
      'Tram 14',
    ]);
  });

  it('refuses a record outside the region, with markup, or with an odd line', () => {
    expect(() => stationsOf([record(1, 'Nulle part', 'METRO 1', 'METRO', 40)])).toThrow();
    expect(() => stationsOf([record(1, '<b>Gare</b>', 'METRO 1', 'METRO')])).toThrow();
    expect(() => stationsOf([record(1, 'Gare', 'METRO 1; drop', 'METRO')])).toThrow();
    expect(() => stationsOf({ records: [] })).toThrow();
  });
});

describe('datasetOf', () => {
  const many = Array.from({ length: MIN_STATIONS }, (_, index) =>
    record(index + 1, `Station ${index + 1}`, 'METRO 1', 'METRO'),
  );

  it('attributes the dataset to IDFM with the date of its last update', () => {
    expect(datasetOf(many, meta()).source).toMatchObject({
      publisher: 'Île-de-France Mobilités',
      licence: 'Licence Ouverte v2.0 (Etalab)',
      modifiedOn: '2025-12-10',
    });
  });

  it('refuses another licence, or an export too short to be whole', () => {
    expect(() => datasetOf(many, meta('Open Database License (ODbL)'))).toThrow(/licence/);
    expect(() => datasetOf(many.slice(1), meta())).toThrow(/truncated/);
  });

  it('serializes one station per line, read back as written', () => {
    const dataset = datasetOf(many, meta());
    const text = serializeDataset(dataset);
    expect(text.split('\n')).toHaveLength(MIN_STATIONS + 6);
    expect(TransitDataset.parse(JSON.parse(text))).toEqual(dataset);
  });
});

describe('the reference file', () => {
  it('is a whole import of IDFM, under the Licence Ouverte', () => {
    expect(transitDataset.stations.length).toBeGreaterThanOrEqual(MIN_STATIONS);
    expect(transitDataset.source.licence).toBe(idfmLicence);
    const abbesses = transitDataset.stations.find((station) =>
      station.stops.some((stop) => stop.name === 'Abbesses'),
    );
    expect(abbesses?.lines).toEqual([{ mode: 'metro', line: '12' }]);
  });
});
