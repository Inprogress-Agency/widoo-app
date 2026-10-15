import { describe, expect, it } from 'vitest';
import { blocksOf, spansOf } from './markdown';

describe('spansOf', () => {
  it('reads the bold runs', () => {
    expect(spansOf('Vous pouvez **retirer votre accord** à tout moment.')).toEqual([
      { text: 'Vous pouvez ', isBold: false },
      { text: 'retirer votre accord', isBold: true },
      { text: ' à tout moment.', isBold: false },
    ]);
  });

  it('keeps an unpaired marker as written', () => {
    expect(spansOf('a ** b')).toEqual([{ text: 'a ** b', isBold: false }]);
  });
});

describe('blocksOf', () => {
  it('splits paragraphs, lists and tables', () => {
    const body = [
      'Premier paragraphe,',
      'sur deux lignes.',
      '',
      '- un',
      '- **deux**',
      '',
      '| Données | Combien de temps |',
      '|---|---|',
      '| Compte | tant que le compte existe |',
    ].join('\n');
    expect(blocksOf(body)).toEqual([
      {
        kind: 'paragraph',
        spans: [{ text: 'Premier paragraphe, sur deux lignes.', isBold: false }],
      },
      {
        kind: 'list',
        items: [[{ text: 'un', isBold: false }], [{ text: 'deux', isBold: true }]],
      },
      {
        kind: 'table',
        rows: [
          {
            cells: [
              { header: 'Données', value: [{ text: 'Compte', isBold: false }] },
              {
                header: 'Combien de temps',
                value: [{ text: 'tant que le compte existe', isBold: false }],
              },
            ],
          },
        ],
      },
    ]);
  });
});
