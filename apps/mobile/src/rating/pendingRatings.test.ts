import { describe, expect, it } from 'vitest';
import { createPendingRatingStore, type PendingRatingStorage } from './pendingRatings';

function memory(initial?: string): PendingRatingStorage & { value?: string } {
  const box: { value?: string } = { value: initial };
  return Object.assign(box, {
    get: () => box.value,
    set: (value: string) => {
      box.value = value;
    },
  });
}

describe('createPendingRatingStore', () => {
  it('keeps the ratings given offline across launches, one per outing', () => {
    const storage = memory();
    const first = createPendingRatingStore(storage);
    first.queue({ plannedId: 'go-1', routeId: 'r-1', body: { rating: 3 } });
    first.queue({ plannedId: 'go-2', routeId: 'r-2', body: { rating: 5, comment: 'Parfait' } });
    first.queue({ plannedId: 'go-1', routeId: 'r-1', body: { rating: 4 } });
    const again = createPendingRatingStore(storage);
    expect(again.pending()).toEqual([
      { plannedId: 'go-2', routeId: 'r-2', body: { rating: 5, comment: 'Parfait' } },
      { plannedId: 'go-1', routeId: 'r-1', body: { rating: 4 } },
    ]);
    again.sent('go-2');
    expect(again.pending()).toEqual([{ plannedId: 'go-1', routeId: 'r-1', body: { rating: 4 } }]);
  });

  it('drops a copy it cannot read', () => {
    expect(createPendingRatingStore(memory('{nope')).pending()).toEqual([]);
    expect(
      createPendingRatingStore(
        memory(
          '[{"plannedId":"x","routeId":"r","body":{"rating":9}},{"plannedId":"y","body":{"rating":3}}]',
        ),
      ).pending(),
    ).toEqual([]);
  });
});
