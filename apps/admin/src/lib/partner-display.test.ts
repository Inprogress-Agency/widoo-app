import { describe, expect, it } from 'vitest';
import { citiesLabelOf, dayLabelOf, monthlyPriceLabelOf } from './partner-display';

const plain = (text: string | null) => text?.replaceAll(/\s/g, ' ') ?? null;

describe('monthlyPriceLabelOf', () => {
  it('writes cents as euros excluding tax, and nothing while the price is unknown', () => {
    expect(plain(monthlyPriceLabelOf(4900))).toBe('49,00 € HT');
    expect(plain(monthlyPriceLabelOf(123456))).toBe('1 234,56 € HT');
    expect(plain(monthlyPriceLabelOf(0))).toBe('0,00 € HT');
    expect(monthlyPriceLabelOf(null)).toBeNull();
  });
});

describe('dayLabelOf', () => {
  it('writes a day of the API, the same whatever the time zone', () => {
    expect(dayLabelOf('2026-11-01')).toBe('1 nov. 2026');
    expect(dayLabelOf('2026-12-31')).toBe('31 déc. 2026');
    expect(dayLabelOf(null)).toBeNull();
  });
});

describe('citiesLabelOf', () => {
  it('lists the cities, or nothing', () => {
    expect(citiesLabelOf(['Lyon', 'Paris'])).toBe('Lyon, Paris');
    expect(citiesLabelOf([])).toBeNull();
  });
});
