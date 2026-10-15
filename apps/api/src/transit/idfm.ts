/**
 * Import of the dataset « Gares et stations du réseau ferré d'Île-de-France (par ligne) » of
 * Île-de-France Mobilités (`emplacement-des-gares-idf`): one record per station and line, kept
 * for the metro, the RER and the tram, grouped by connection zone. Every record is validated
 * before it enters the reference file; an unexpected licence or a short export is refused.
 */
import { roundedPoint } from '@widoo/orchestration';
import { z } from 'zod';
import {
  stationModes,
  TransitDataset,
  TransitStation,
  type StationMode,
  type TransitLine,
} from './stations';

const catalogue =
  'https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/emplacement-des-gares-idf';
/** Fixed addresses: the import never fetches a URL it is given. */
export const idfmMetaUrl = catalogue;
export const idfmExportUrl = `${catalogue}/exports/json`;

export const idfmLicence = 'Licence Ouverte v2.0 (Etalab)';

const source = {
  publisher: 'Île-de-France Mobilités',
  dataset: "Gares et stations du réseau ferré d'Île-de-France (par ligne)",
  url: 'https://data.iledefrance-mobilites.fr/explore/dataset/emplacement-des-gares-idf/',
  licence: idfmLicence,
  licenceUrl: 'https://www.etalab.gouv.fr/licence-ouverte-open-licence/',
} as const;

/** Below that many stations, the export is taken for truncated and the file is kept as it is. */
export const MIN_STATIONS = 500;

const modeOf: Record<string, StationMode> = {
  METRO: 'metro',
  RER: 'rer',
  TRAMWAY: 'tram',
  TRAM: 'tram',
};

/** The fields read from a record, the others are dropped; coordinates within the region. */
const IdfmRecord = z.object({
  id_ref_zdc: z.number().int().positive(),
  nom_gares: z.string(),
  res_com: z.string(),
  mode: z.string(),
  geo_point_2d: z.object({
    lat: z.number().min(48).max(49.5),
    lon: z.number().min(1.4).max(3.6),
  }),
});
type IdfmRecord = z.infer<typeof IdfmRecord>;

/** What the catalogue says of the dataset: its licence and its last update. */
export const IdfmMeta = z.object({
  metas: z.object({
    default: z.object({ license: z.string(), modified: z.iso.datetime({ offset: true }) }),
  }),
});

/** Without invisible characters: a zero-width space follows `Porte de Champerret`. */
const cleanName = (name: string) =>
  name
    .normalize('NFC')
    .replace(/\p{Cf}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

/** `METRO 12` → `12`, `RER A` → `A`, `TRAM 3a` → `3a`. */
const lineOf = (record: IdfmRecord): TransitLine | null => {
  const mode = modeOf[record.mode];
  return mode ? { mode, line: record.res_com.replace(/^\S+\s+/, '').trim() } : null;
};

const compareLines = (a: TransitLine, b: TransitLine) =>
  stationModes.indexOf(a.mode) - stationModes.indexOf(b.mode) ||
  a.line.localeCompare(b.line, 'fr', { numeric: true });

/** A record of any mode: only those of `modeOf` are read further. */
const AnyRecord = z.looseObject({ mode: z.string() });

type Zone = {
  lines: Map<string, TransitLine>;
  stops: Map<string, TransitStation['stops'][number]>;
};

/** The stations of the export, sorted by id, their lines in the order of `stationModes`. */
export function stationsOf(records: unknown): TransitStation[] {
  const byZone = new Map<number, Zone>();
  for (const record of z.array(AnyRecord).parse(records)) {
    if (!modeOf[record.mode]) continue;
    const parsed = IdfmRecord.parse(record);
    const line = lineOf(parsed);
    if (!line) continue;
    const zone = byZone.get(parsed.id_ref_zdc) ?? { lines: new Map(), stops: new Map() };
    byZone.set(parsed.id_ref_zdc, zone);
    zone.lines.set(`${line.mode}:${line.line}`, line);
    const point = roundedPoint({ lat: parsed.geo_point_2d.lat, lng: parsed.geo_point_2d.lon });
    const stop = { name: cleanName(parsed.nom_gares), ...point };
    zone.stops.set(`${stop.name}:${stop.lat}:${stop.lng}`, stop);
  }
  return [...byZone]
    .sort(([a], [b]) => a - b)
    .map(([id, zone]) =>
      TransitStation.parse({
        id: String(id),
        lines: [...zone.lines.values()].sort(compareLines),
        stops: [...zone.stops.values()],
      }),
    );
}

/** The reference file of an export and its catalogue entry. */
export function datasetOf(records: unknown, meta: unknown): TransitDataset {
  const { license, modified } = IdfmMeta.parse(meta).metas.default;
  if (license !== idfmLicence) {
    throw new Error(`The licence of the dataset changed (${license}): check it before importing`);
  }
  const stations = stationsOf(records);
  if (stations.length < MIN_STATIONS) {
    throw new Error(`Only ${stations.length} stations in the export: truncated, not imported`);
  }
  return TransitDataset.parse({
    source: { ...source, modifiedOn: modified.slice(0, 10) },
    stations,
  });
}

/** The file as it is versioned: one station per line, so that a refresh diffs station by station. */
export function serializeDataset(dataset: TransitDataset): string {
  const stations = dataset.stations.map((station) => `    ${JSON.stringify(station)}`);
  return `{\n  "source": ${JSON.stringify(dataset.source)},\n  "stations": [\n${stations.join(',\n')}\n  ]\n}\n`;
}
