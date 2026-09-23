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

describe('labels.fr', () => {
  it.each(groups)('%s: one non-empty label per value, and no other', (taxonomy, values) => {
    const group: Record<string, string> = labels.fr[taxonomy];
    expect(Object.keys(group).sort()).toEqual([...values].sort());
    for (const value of values) expect(group[value]).toMatch(/\S/);
  });
});
