import { describe, expect, it } from 'vitest';
import { diversify } from './diversity';

type Item = { id: string; mainMood: string | null; neighborhood: string | null };
const item = (id: string, mainMood: string | null, neighborhood: string | null): Item => ({
  id,
  mainMood,
  neighborhood,
});
const ids = (items: Item[]) => items.map(({ id }) => id).join(' ');

describe('diversity pass', () => {
  it('keeps a ranking without two alike neighbours as it is', () => {
    const ranked = [
      item('a', 'food', 'Marais'),
      item('b', 'food', 'Bastille'),
      item('c', 'culture', 'Marais'),
    ];
    expect(ids(diversify(ranked))).toBe('a b c');
  });

  it('pushes back a route sharing the main mood and the neighbourhood of the previous one', () => {
    const ranked = [
      item('a', 'food', 'Marais'),
      item('b', 'food', 'Marais'),
      item('c', 'culture', 'Marais'),
    ];
    expect(ids(diversify(ranked))).toBe('a c b');
  });

  it('only needs one of the two to differ', () => {
    const ranked = [
      item('a', 'food', 'Marais'),
      item('b', 'culture', 'Marais'),
      item('c', 'culture', 'Bastille'),
    ];
    expect(ids(diversify(ranked))).toBe('a b c');
  });

  it('pushes a route back three positions at most', () => {
    const ranked = [
      item('a', 'food', 'Marais'),
      item('b', 'food', 'Marais'),
      item('c', 'food', 'Marais'),
      item('d', 'food', 'Marais'),
      item('e', 'culture', 'Bastille'),
      item('f', 'nature', 'Belleville'),
    ];
    const result = diversify(ranked).map(({ id }) => id);
    for (const [rank, route] of ranked.entries()) {
      expect(result.indexOf(route.id) - rank).toBeLessThanOrEqual(3);
    }
    expect(result.join(' ')).toBe('a e b f c d');
  });

  it('brings a different route forward three positions at most', () => {
    const ranked = [
      item('a', 'food', 'Marais'),
      item('b', 'food', 'Marais'),
      item('c', 'food', 'Marais'),
      item('d', 'food', 'Marais'),
      item('e', 'food', 'Marais'),
      item('f', 'culture', 'Bastille'),
    ];
    // `b` has no different route within three positions; `c` has `f`, three positions ahead.
    const result = diversify(ranked);
    expect(ids(result)).toBe('a b f c d e');
    for (const [position, route] of result.entries()) {
      expect(ranked.indexOf(route) - position).toBeLessThanOrEqual(3);
    }
  });

  it('never tells two routes apart on an unknown mood or neighbourhood', () => {
    const ranked = [
      item('a', 'food', null),
      item('b', 'food', null),
      item('c', null, 'Marais'),
      item('d', null, 'Marais'),
    ];
    expect(ids(diversify(ranked))).toBe('a b c d');
  });

  it('keeps every route once', () => {
    const ranked = Array.from({ length: 40 }, (_, index) =>
      item(
        `r${index}`,
        index % 3 === 0 ? 'food' : 'culture',
        index % 2 === 0 ? 'Marais' : 'Bastille',
      ),
    );
    const result = diversify(ranked);
    expect(result).toHaveLength(40);
    expect(new Set(result.map(({ id }) => id)).size).toBe(40);
  });
});
