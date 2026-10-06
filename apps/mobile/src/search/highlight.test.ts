import { describe, expect, it } from 'vitest';
import { highlightParts } from './highlight';

describe('highlightParts', () => {
  it('puts the part typed in bold, case aside', () => {
    expect(highlightParts('Pique-nique au bord du canal', 'CANAL')).toEqual([
      { text: 'Pique-nique au bord du ', isMatch: false },
      { text: 'canal', isMatch: true },
    ]);
  });

  it('finds a name typed without its accents', () => {
    expect(highlightParts('République', 'republ')).toEqual([
      { text: 'Républ', isMatch: true },
      { text: 'ique', isMatch: false },
    ]);
  });

  it('leaves a name that does not hold the text plain', () => {
    expect(highlightParts('Montmartre', 'canal')).toEqual([{ text: 'Montmartre', isMatch: false }]);
    expect(highlightParts('Montmartre', '  ')).toEqual([{ text: 'Montmartre', isMatch: false }]);
  });
});
