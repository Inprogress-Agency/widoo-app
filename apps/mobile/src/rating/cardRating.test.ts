import { describe, expect, it } from 'vitest';
import { withRouteRating } from './cardRating';

const rating = { average: 4.2, count: 5 };
const card = (id: string) => ({ id, title: id, rating: { average: null, count: 0 } });

describe('withRouteRating', () => {
  it('writes the rating into the cards of a page, of a list and into a sheet', () => {
    const page = { items: [card('a'), card('b')], nextCursor: null };
    expect(withRouteRating(page, 'b', rating).items.map((item) => item.rating)).toEqual([
      { average: null, count: 0 },
      rating,
    ]);
    const list = { pages: [page], pageParams: [null] };
    expect(withRouteRating(list, 'a', rating).pages[0]?.items[0]?.rating).toEqual(rating);
    expect(withRouteRating({ ...card('a'), reviews: [] }, 'a', rating).rating).toEqual(rating);
  });

  it('leaves anything else as it is', () => {
    const other = { kind: 'removed', removedAt: '2026-10-01' };
    expect(withRouteRating(other, 'a', rating)).toBe(other);
    expect(withRouteRating(null, 'a', rating)).toBeNull();
  });
});
