/**
 * `pnpm --filter @widoo/api transit:import`: refreshes `generated/stations.json` from the open
 * data of Île-de-France Mobilités, to commit through a pull request. Downloads the export and the
 * catalogue entry from their fixed addresses; `--file <export.json> --meta <catalogue.json>`
 * reads files downloaded by hand instead. Run it after an update of the dataset (its catalogue
 * gives the date), at least once a quarter.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { datasetOf, idfmExportUrl, idfmMetaUrl, serializeDataset } from './idfm';

const outputPath = new URL('./generated/stations.json', import.meta.url);
/** The export weighs about 1.2 MB: anything far larger is not the dataset expected. */
const MAX_BYTES = 20 * 1024 * 1024;

async function download(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000), redirect: 'error' });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  const body = await response.text();
  if (body.length > MAX_BYTES) throw new Error(`${url} answered more than ${MAX_BYTES} bytes`);
  return JSON.parse(body);
}

const readJson = async (path: string): Promise<unknown> => JSON.parse(await readFile(path, 'utf8'));

const { values } = parseArgs({
  options: { file: { type: 'string' }, meta: { type: 'string' } },
});
if ((values.file === undefined) !== (values.meta === undefined)) {
  throw new Error('--file and --meta go together');
}
const [records, meta] = await Promise.all(
  values.file && values.meta
    ? [readJson(values.file), readJson(values.meta)]
    : [download(idfmExportUrl), download(idfmMetaUrl)],
);
const dataset = datasetOf(records, meta);
await writeFile(outputPath, serializeDataset(dataset));
console.info(
  `${dataset.stations.length} stations written, dataset of ${dataset.source.modifiedOn}`,
);
