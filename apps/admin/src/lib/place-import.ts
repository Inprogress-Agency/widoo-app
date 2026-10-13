import { parseCsv } from '@/lib/csv';
import { emptyPlaceForm, placeInputOf, type PlaceFormValues } from '@/lib/place-form';
import {
  labels,
  placeImportMaxRows,
  taxonomies,
  type CatalogPlaceInput,
  type PlaceImportOutcome,
  type PlaceImportResult,
  type PlaceImportRowResult,
} from '@widoo/shared';

const dayColumns = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const requiredColumns = ['nom', 'categorie', 'adresse', 'latitude', 'longitude'];
/** Columns of the file of places, in the order of the template. */
export const placeImportColumns = [
  ...requiredColumns,
  'interieur',
  'prix',
  'site_web',
  'telephone',
  ...dayColumns,
];

const exampleRow = [
  'Café Exemple',
  labels.fr.placeCategories.cafe,
  '12 rue des Martyrs, 75009 Paris',
  '48,8785',
  '2,3397',
  'oui',
  labels.fr.priceRanges.low,
  'https://cafe.example',
  '+33 1 42 00 00 00',
  '8:00-18:00',
  '8:00-18:00',
  '8:00-18:00',
  '8:00-18:00',
  '8:00-18:00',
  '9:00-12:30, 14:00-19:00',
  '',
];
/** The template to download: the columns, and a line to replace. Opens in a spreadsheet. */
export const placeImportTemplate = `\uFEFF${placeImportColumns.join(';')}\n${exampleRow.join(';')}\n`;

/** A line of the file: the place to send, or the fields that cannot be read here. */
export type PlaceImportRow = {
  line: number;
  name: string;
  place: CatalogPlaceInput | null;
  /** Fields refused before the API is asked, named as `CatalogPlaceInput` names them. */
  unreadFields: string[];
};

export type PlaceImportFileError =
  { error: 'empty' | 'tooMany' } | { error: 'columns'; missing: string[] };

const normalized = (text: string) => text.trim().toLocaleLowerCase('fr');

/** The key a cell names by its French label or by the key itself; the cell as typed otherwise. */
function keyOf<Key extends string>(cell: string, keys: readonly Key[], names: Record<Key, string>) {
  return keys.find((key) => normalized(names[key]) === normalized(cell) || key === cell) ?? cell;
}

const yes = ['oui', 'o', 'yes', 'true', '1'];
const no = ['', 'non', 'n', 'no', 'false', '0'];

function rowOf(line: number, cellOf: (column: string) => string): PlaceImportRow {
  const indoor = normalized(cellOf('interieur'));
  const values: PlaceFormValues = {
    ...emptyPlaceForm,
    name: cellOf('nom'),
    category: keyOf(
      cellOf('categorie'),
      taxonomies.placeCategories,
      labels.fr.placeCategories,
    ) as PlaceFormValues['category'],
    address: cellOf('adresse'),
    latitude: cellOf('latitude'),
    longitude: cellOf('longitude'),
    isIndoor: yes.includes(indoor),
    priceRange: keyOf(cellOf('prix'), taxonomies.priceRanges, labels.fr.priceRanges),
    websiteUrl: cellOf('site_web'),
    phone: cellOf('telephone'),
    dayHours: dayColumns.map(cellOf),
  };
  const unreadFields = yes.includes(indoor) || no.includes(indoor) ? [] : ['isIndoor'];
  const result = placeInputOf(values, []);
  if ('error' in result) {
    unreadFields.push(result.error === 'position' ? 'location' : 'hours');
  }
  const place = 'input' in result && unreadFields.length === 0 ? result.input : null;
  return { line, name: values.name, place, unreadFields };
}

/**
 * The places of a CSV text, one per line under the header, or why the file cannot be used: no
 * line, a required column missing, or more lines than an import takes.
 */
export function readPlaceImport(text: string): { rows: PlaceImportRow[] } | PlaceImportFileError {
  const [header, ...lines] = parseCsv(text);
  if (!header || lines.length === 0) {
    return { error: 'empty' };
  }
  const columns = header.cells.map(normalized);
  const missing = requiredColumns.filter((column) => !columns.includes(column));
  if (missing.length > 0) {
    return { error: 'columns', missing };
  }
  if (lines.length > placeImportMaxRows) {
    return { error: 'tooMany' };
  }
  return {
    rows: lines.map(({ line, cells }) =>
      rowOf(line, (column) => cells[columns.indexOf(column)] ?? ''),
    ),
  };
}

/** A line of the file with what became of it, as the table shows it. */
export type PlaceImportLine = PlaceImportRowResult & { name: string };

/**
 * Every line of the file with its outcome: the answer of the API for the lines sent, and
 * `invalid` for those that could not be read and were not sent.
 */
export function placeImportLinesOf(
  rows: readonly PlaceImportRow[],
  result: PlaceImportResult,
): PlaceImportLine[] {
  return rows.map((row) => {
    const answered = result.rows.find((answer) => answer.line === row.line);
    return (
      answered
        ? { ...answered, name: row.name }
        : {
            line: row.line,
            name: row.name,
            outcome: 'invalid',
            fields: row.unreadFields,
            duplicateOf: null,
          }
    ) satisfies PlaceImportLine;
  });
}

/** How many lines ended with `outcome`. */
export const countPlaceImportLines = (
  lines: readonly PlaceImportLine[],
  outcome: PlaceImportOutcome,
) => lines.filter((line) => line.outcome === outcome).length;
