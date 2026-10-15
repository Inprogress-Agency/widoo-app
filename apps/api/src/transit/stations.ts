/**
 * Stations of the rail network of Île-de-France (metro, RER, tram), from the open data of
 * Île-de-France Mobilités under the Licence Ouverte v2.0 (Etalab): the reference file
 * `generated/stations.json`, written by `pnpm --filter @widoo/api transit:import` and versioned,
 * so that the API never calls the network for it. Validated at load: a broken file fails loudly.
 */
import { HttpsUrl, Latitude, Longitude, plainText } from '@widoo/shared';
import { z } from 'zod';
import raw from './generated/stations.json';

/** Modes of the access (D-050): the metro, the RER and the tram, in the order lines are listed. */
export const stationModes = ['metro', 'rer', 'tram'] as const;
export type StationMode = (typeof stationModes)[number];

/** A line as the operator names it: `12`, `3bis`, `A`, `3a`. */
export const TransitLine = z.object({
  mode: z.enum(stationModes),
  line: z.string().regex(/^[0-9A-Za-z]{1,5}$/),
});
export type TransitLine = z.infer<typeof TransitLine>;

/** Where a line stops: its name may differ from one line to another of the same station. */
const TransitStop = z.object({ name: plainText(80), lat: Latitude, lng: Longitude });

/** A connection zone of IDFM (`id_ref_zdc`): every line that stops there, and their stops. */
export const TransitStation = z.object({
  id: z.string().regex(/^\d+$/),
  lines: z.array(TransitLine).min(1),
  stops: z.array(TransitStop).min(1),
});
export type TransitStation = z.infer<typeof TransitStation>;

/** What the attribution of the Licence Ouverte asks: the source and its last update. */
export const TransitSource = z.object({
  publisher: z.literal('Île-de-France Mobilités'),
  dataset: z.string().min(1),
  url: HttpsUrl,
  licence: z.literal('Licence Ouverte v2.0 (Etalab)'),
  licenceUrl: HttpsUrl,
  /** Last update of the dataset at IDFM, as its catalogue gives it. */
  modifiedOn: z.iso.date(),
});

export const TransitDataset = z.object({
  source: TransitSource,
  stations: z.array(TransitStation).min(1),
});
export type TransitDataset = z.infer<typeof TransitDataset>;

export const transitDataset: TransitDataset = TransitDataset.parse(raw);
