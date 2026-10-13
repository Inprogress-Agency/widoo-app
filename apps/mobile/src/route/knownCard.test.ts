import { QueryClient } from '@tanstack/react-query';
import { RouteDetail } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { knownCard } from './knownCard';
import fixtures from './generated/route-sheets.json';

// A card shaped from a demo sheet: the fields of the search, its steps as map pins.
const sheet = fixtures.routes[0] as (typeof fixtures.routes)[number];
const card = {
  ...Object.fromEntries(
    Object.entries(sheet).filter(([key]) =>
      [
        'id',
        'title',
        'coverUrl',
        'isOfficial',
        'author',
        'access',
        'isVerified',
        'moods',
        'audiences',
        'conditions',
        'transport',
        'district',
        'neighborhood',
        'durationMin',
        'durationBucket',
        'budgetPerPersonEur',
        'budgetBucket',
        'distanceM',
        'rating',
        'stepCount',
        'isLocked',
      ].includes(key),
    ),
  ),
  steps: RouteDetail.parse(sheet).steps.flatMap((step) =>
    step.isLocked
      ? []
      : [
          {
            category: step.place.category,
            location: step.place.location,
            name: step.place.name,
            durationMin: step.durationMin,
          },
        ],
  ),
};

describe('knownCard', () => {
  it('finds the card in a search answer or in the pages of a list', () => {
    const client = new QueryClient();
    expect(knownCard(client, sheet.id)).toBeNull();
    client.setQueryData(['routes', 'list', 1], { pages: [{ items: [card], nextCursor: null }] });
    expect(knownCard(client, sheet.id)?.title).toBe(sheet.title);
    const search = new QueryClient();
    search.setQueryData(['routes', 'search', 'zone'], {
      items: [card],
      nextCursor: null,
      clusters: null,
    });
    expect(knownCard(search, sheet.id)?.id).toBe(sheet.id);
  });

  it('ignores a cached item this build cannot read', () => {
    const client = new QueryClient();
    client.setQueryData(['routes', 'search', 'zone'], { items: [{ id: sheet.id }] });
    expect(knownCard(client, sheet.id)).toBeNull();
  });
});
