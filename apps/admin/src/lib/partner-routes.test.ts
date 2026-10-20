import { describe, expect, it } from 'vitest';
import {
  isChoiceComplete,
  withMovedRoute,
  withoutRoute,
  withRoute,
  type PickedRoute,
} from './partner-routes';

const route = (n: number): PickedRoute => ({ id: `id-${n}`, title: `Parcours ${n}` });
const routes = (count: number) => Array.from({ length: count }, (_, i) => route(i + 1));
const ids = (picked: PickedRoute[]) => picked.map((item) => item.id);

describe('withRoute', () => {
  it('adds a route at the end, once, and never past 10', () => {
    expect(ids(withRoute(routes(2), route(3)))).toEqual(['id-1', 'id-2', 'id-3']);
    expect(ids(withRoute(routes(2), route(1)))).toEqual(['id-1', 'id-2']);
    expect(withRoute(routes(10), route(11))).toHaveLength(10);
  });
});

describe('withoutRoute', () => {
  it('removes a route and keeps the order of the others', () => {
    expect(ids(withoutRoute(routes(4), 'id-2'))).toEqual(['id-1', 'id-3', 'id-4']);
    expect(ids(withoutRoute(routes(2), 'unknown'))).toEqual(['id-1', 'id-2']);
  });
});

describe('withMovedRoute', () => {
  it('moves a route up or down by one place, and stays at both ends', () => {
    expect(ids(withMovedRoute(routes(3), 'id-2', -1))).toEqual(['id-2', 'id-1', 'id-3']);
    expect(ids(withMovedRoute(routes(3), 'id-2', 1))).toEqual(['id-1', 'id-3', 'id-2']);
    expect(ids(withMovedRoute(routes(3), 'id-1', -1))).toEqual(['id-1', 'id-2', 'id-3']);
    expect(ids(withMovedRoute(routes(3), 'id-3', 1))).toEqual(['id-1', 'id-2', 'id-3']);
    expect(ids(withMovedRoute(routes(3), 'unknown', 1))).toEqual(['id-1', 'id-2', 'id-3']);
  });
});

describe('isChoiceComplete', () => {
  it('holds from 3 to 10 routes', () => {
    expect([2, 3, 10, 11].map((count) => isChoiceComplete(routes(count)))).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });
});
