import { describe, expect, it } from 'vitest';
import { labels } from './labels';
import { taxonomies, type Taxonomy } from './taxonomies';

const groups = Object.entries(taxonomies) as [Taxonomy, readonly string[]][];

describe('taxonomies', () => {
  it.each(groups)('%s: keys are unique ASCII snake_case, never a French label', (_, values) => {
    for (const value of values) expect(value).toMatch(/^[a-z0-9]+(_[a-z0-9]+)*$/);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('budget keys', () => {
  it('name the highest bucket high, and keep premium for the subscription (D-016)', () => {
    expect(taxonomies.budgets).toEqual(['free', 'low', 'medium', 'high']);
    expect(taxonomies.plans).toEqual(['free', 'premium']);
  });
});

describe('labels.fr', () => {
  it.each(groups)('%s: one non-empty label per value, and no other', (taxonomy, values) => {
    const group: Record<string, string> = labels.fr[taxonomy];
    expect(Object.keys(group).sort()).toEqual([...values].sort());
    for (const value of values) expect(group[value]).toMatch(/\S/);
  });
});

describe('labels.fr of budget and duration', () => {
  it('show amounts and hours, word for word as Filtres-et-Recherche › Taxonomie (D-010)', () => {
    expect(labels.fr.budgets).toEqual({
      free: 'Gratuit',
      low: "Jusqu'à 25 €",
      medium: '25 à 70 €',
      high: 'Plus de 70 €',
    });
    expect(labels.fr.durations).toEqual({
      '1_2h': "Jusqu'à 2 h 30",
      half_day: '2 h 30 à 5 h',
      full_day: '5 à 12 h',
      weekend: 'Plus de 12 h',
    });
  });
});
