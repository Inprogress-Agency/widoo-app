import { describe, expect, it } from 'vitest';
import {
  placeImportLinesOf,
  placeImportTemplate,
  readPlaceImport,
  type PlaceImportRow,
} from './place-import';

const header = 'nom;categorie;adresse;latitude;longitude;interieur;prix;lundi';

describe('readPlaceImport', () => {
  it('reads the template as one place ready to send', () => {
    const result = readPlaceImport(placeImportTemplate.replace('\uFEFF', ''));

    expect(result).toMatchObject({
      rows: [
        {
          line: 2,
          name: 'Café Exemple',
          unreadFields: [],
          place: {
            category: 'cafe',
            location: { lat: 48.8785, lng: 2.3397 },
            isIndoor: true,
            priceRange: 'low',
            websiteUrl: 'https://cafe.example',
          },
        },
      ],
    });
    expect('rows' in result && result.rows[0]?.place?.hours).toHaveLength(7);
  });

  it('names what cannot be read on a line, and leaves the rest to the API', () => {
    const result = readPlaceImport(
      [
        header,
        'Sans position;Café;1 rue A;;2,3;;;',
        'Horaire faux;Café;1 rue A;48,8;2,3;peut-être;;matin',
        'Catégorie inconnue;Astroport;1 rue A;48,8;2,3;non;;',
      ].join('\n'),
    );

    const rows = 'rows' in result ? result.rows : [];
    expect(rows.map((row) => row.unreadFields)).toEqual([['location'], ['isIndoor', 'hours'], []]);
    expect(rows.map((row) => row.place === null)).toEqual([true, true, false]);
    expect(rows[2]?.place?.category).toBe('Astroport');
  });

  it('refuses a file without line or without a required column', () => {
    expect(readPlaceImport(header)).toEqual({ error: 'empty' });
    expect(readPlaceImport('nom;adresse\nLomi;Paris')).toEqual({
      error: 'columns',
      missing: ['categorie', 'latitude', 'longitude'],
    });
  });

  it('refuses more lines than an import takes', () => {
    const lines = Array.from({ length: 501 }, (_, index) => `Lieu ${index};Café;A;48,8;2,3;;;`);
    expect(readPlaceImport([header, ...lines].join('\n'))).toEqual({ error: 'tooMany' });
  });
});

describe('placeImportLinesOf', () => {
  it('joins the answer of the API to the lines that were not sent', () => {
    const rows: PlaceImportRow[] = [
      { line: 2, name: 'Lomi', place: null, unreadFields: ['hours'] },
      { line: 3, name: 'Progrès', place: null, unreadFields: [] },
    ];

    const lines = placeImportLinesOf(rows, {
      rows: [{ line: 3, outcome: 'ready', fields: [], duplicateOf: null }],
      counts: { ready: 1, created: 0, invalid: 0, duplicate: 0, outside: 0 },
    });

    expect(lines).toEqual([
      { line: 2, name: 'Lomi', outcome: 'invalid', fields: ['hours'], duplicateOf: null },
      { line: 3, name: 'Progrès', outcome: 'ready', fields: [], duplicateOf: null },
    ]);
  });
});
