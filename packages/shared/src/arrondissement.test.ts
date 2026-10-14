import { describe, expect, it } from 'vitest';
import { arrondissementLabel } from './arrondissement';

describe('arrondissementLabel', () => {
  it.each([
    [1, '1er'],
    [2, '2e'],
    [11, '11e'],
    [20, '20e'],
  ])('%i is « %s » in French', (number, label) => {
    expect(arrondissementLabel(number, 'fr')).toBe(label);
  });

  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
  ])('%i is « %s » in English', (number, label) => {
    expect(arrondissementLabel(number, 'en')).toBe(label);
  });
});
