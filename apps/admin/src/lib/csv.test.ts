import { describe, expect, it } from 'vitest';
import { decodeCsv, parseCsv } from './csv';

describe('parseCsv', () => {
  it('reads rows separated by semicolons, with the line of each', () => {
    expect(parseCsv('nom;adresse\nCafé Lomi; 3 rue Marcadet \n\nLe Progrès;1 rue Yvonne')).toEqual([
      { line: 1, cells: ['nom', 'adresse'] },
      { line: 2, cells: ['Café Lomi', '3 rue Marcadet'] },
      { line: 4, cells: ['Le Progrès', '1 rue Yvonne'] },
    ]);
  });

  it('reads commas when the first line uses them, and Windows line ends', () => {
    expect(parseCsv('nom,adresse\r\nLomi,Paris\r\n')).toEqual([
      { line: 1, cells: ['nom', 'adresse'] },
      { line: 2, cells: ['Lomi', 'Paris'] },
    ]);
  });

  it('keeps separators, quotes and line breaks of a quoted cell', () => {
    expect(parseCsv('nom;adresse\n"Chez ""Jo""";"3 rue; fond\nde cour"\nSuivant;Paris')).toEqual([
      { line: 1, cells: ['nom', 'adresse'] },
      { line: 2, cells: ['Chez "Jo"', '3 rue; fond\nde cour'] },
      { line: 4, cells: ['Suivant', 'Paris'] },
    ]);
  });
});

describe('decodeCsv', () => {
  it('reads UTF-8 without its byte order mark', () => {
    const bytes = new TextEncoder().encode('\uFEFFCafé');
    expect(decodeCsv(bytes.buffer as ArrayBuffer)).toBe('Café');
  });

  it('falls back to the encoding of a spreadsheet on Windows', () => {
    const bytes = new Uint8Array([0x43, 0x61, 0x66, 0xe9]);
    expect(decodeCsv(bytes.buffer)).toBe('Café');
  });
});
