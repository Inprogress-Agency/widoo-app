import { getSessionClients } from '@/lib/auth/clients';
import { decodeCsv } from '@/lib/csv';
import {
  placeImportLinesOf,
  readPlaceImport,
  type PlaceImportLine,
  type PlaceImportRow,
} from '@/lib/place-import';
import { useState } from 'react';

/** Why a file gave nothing: it cannot be used as it is, or the API did not answer. */
export type PlaceImportFailure =
  { reason: 'empty' | 'tooMany' | 'failed' } | { reason: 'columns'; missing: string[] };

type ImportState =
  | { step: 'pick' }
  | {
      step: 'preview' | 'done';
      fileName: string;
      rows: PlaceImportRow[];
      lines: PlaceImportLine[];
    };

/** Sends the lines that hold a place, and gives each line given with what became of it. */
async function send(rows: PlaceImportRow[], dryRun: boolean): Promise<PlaceImportLine[]> {
  const sent = rows.flatMap(({ line, place }) => (place ? [{ line, place }] : []));
  if (sent.length === 0) {
    return placeImportLinesOf(rows, {
      rows: [],
      counts: { ready: 0, created: 0, invalid: 0, duplicate: 0, outside: 0 },
    });
  }
  return placeImportLinesOf(
    rows,
    await getSessionClients().api.importPlaces({ dryRun, rows: sent }),
  );
}

/**
 * The import of places from a CSV file (A-04), in two steps: the file is read and the API says
 * what each line would become (`preview`), then the lines that are ready are created (`done`).
 */
export function usePlaceImport() {
  const [state, setState] = useState<ImportState>({ step: 'pick' });
  const [failure, setFailure] = useState<PlaceImportFailure | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const run = async (task: () => Promise<void>) => {
    setFailure(null);
    setIsBusy(true);
    try {
      await task();
    } catch {
      setFailure({ reason: 'failed' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleFile = (file: File) =>
    run(async () => {
      const read = readPlaceImport(decodeCsv(await file.arrayBuffer()));
      if ('error' in read) {
        setFailure(
          read.error === 'columns'
            ? { reason: 'columns', missing: read.missing }
            : { reason: read.error },
        );
        return;
      }
      const lines = await send(read.rows, true);
      setState({ step: 'preview', fileName: file.name, rows: read.rows, lines });
    });

  const handleConfirm = () =>
    run(async () => {
      if (state.step !== 'preview') {
        return;
      }
      const isReady = (line: number) =>
        state.lines.some((other) => other.line === line && other.outcome === 'ready');
      const created = await send(
        state.rows.filter((row) => isReady(row.line)),
        false,
      );
      const lines = state.lines.map(
        (line) => created.find((other) => other.line === line.line) ?? line,
      );
      setState({ ...state, step: 'done', lines });
    });

  return {
    state,
    failure,
    isBusy,
    handleFile: (file: File) => void handleFile(file),
    handleConfirm: () => void handleConfirm(),
    handleReset: () => {
      setFailure(null);
      setState({ step: 'pick' });
    },
  };
}
