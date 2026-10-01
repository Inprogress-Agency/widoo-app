import type { Mood } from '@widoo/shared';

/**
 * What the page `/r/` shows of a route (E-21): the card, never the detail of the steps. Built on
 * the server from the API; only these fields reach the page.
 */
export type SharedRoute = {
  id: string;
  title: string;
  coverUrl: string | null;
  /** First mood of the route, shown before the arrondissement and the neighbourhood. */
  mood: Mood | null;
  district: string | null;
  neighborhood: string | null;
  durationMin: number;
  /** Exact sum; rounded at display (D-032). */
  budgetPerPersonEur: number;
  distanceM: number;
  stepCount: number;
  /** Null until the first review: the rating is then hidden. */
  rating: { average: number; count: number } | null;
  /** « Par Widoo » for the routes of the team, the first name of the creator otherwise. */
  author: { kind: 'widoo' } | { kind: 'member'; firstName: string };
  access: 'free' | 'premium';
};

export type SharedRouteResult =
  | { kind: 'public'; route: SharedRoute }
  /** Opened with its private link: shown without its rating (E-21). */
  | { kind: 'private'; route: SharedRoute }
  /** Removed by its creator: date of the removal when the API gives it. */
  | { kind: 'removed'; removedAt: string | null }
  | { kind: 'unknown' };

/** Identifies a shared route: its id, and the token of its private link when there is one. */
export type SharedRouteKey = { id: string; token?: string };
