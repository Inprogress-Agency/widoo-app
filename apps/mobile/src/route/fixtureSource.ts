import { ApiRequestError, type RouteSheetAnswer } from '@widoo/api-client';
import { computeTimeline } from '@widoo/orchestration';
import { RouteDetail } from '@widoo/shared';
import type { RouteSheetSource } from './source';
import fixtures from './generated/route-sheets.json';

/** A failure a fixture answers, after `delayMs`: no network, or a server error. */
export interface FixtureFailure {
  kind: 'network' | 'server';
  delayMs: number;
}

export interface RouteSheetFixtureData {
  routes: unknown[];
  removed: { id: string; removedAt: string }[];
}

interface FixtureSourceOptions {
  /** Time to answer, as a request over the network would take. */
  latencyMs: number;
  /** Time to compute a timeline, which the API does without reading the network. */
  timelineLatencyMs: number;
  /** Ids that fail, for the error states of the sheet. */
  failures: Record<string, FixtureFailure>;
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });

const failure = (kind: FixtureFailure['kind']) =>
  kind === 'network'
    ? new ApiRequestError('network', null, null)
    : new ApiRequestError('http', 500, { code: 'internal_error', message: 'Fixture failure' });

/**
 * A route sheet source on fixtures: each sheet is checked by the `shared` schema, as the API
 * client checks an answer; an unknown id answers 404 `not_found`.
 */
export function createFixtureSource(
  data: RouteSheetFixtureData,
  { latencyMs, timelineLatencyMs, failures }: FixtureSourceOptions,
): RouteSheetSource {
  /** The sheet of `id`, or the error the API would answer. */
  const sheetOf = (id: string) => {
    const raw = data.routes.find(
      (route) => typeof route === 'object' && route !== null && 'id' in route && route.id === id,
    );
    if (!raw) {
      throw new ApiRequestError('http', 404, { code: 'not_found', message: 'Route not found' });
    }
    const parsed = RouteDetail.safeParse(raw);
    if (!parsed.success) {
      throw new ApiRequestError('invalid_response', 200, null, { cause: parsed.error });
    }
    return parsed.data;
  };

  return {
    getRoute: async (id, options = {}): Promise<RouteSheetAnswer> => {
      const failing = failures[id];
      await wait(failing?.delayMs ?? latencyMs, options.signal);
      if (failing) {
        throw failure(failing.kind);
      }
      const removed = data.removed.find((route) => route.id === id);
      if (removed) {
        return { kind: 'removed', removedAt: removed.removedAt };
      }
      return { kind: 'route', route: sheetOf(id) };
    },

    // As the API: the steps of the sheet, their trips and the hours of their places, in Paris.
    getTimeline: async (id, startsAt, signal) => {
      await wait(timelineLatencyMs, signal);
      const failing = failures[id];
      if (failing) {
        throw failure(failing.kind);
      }
      const steps = sheetOf(id).steps.map((step) => ({
        id: step.id,
        durationMin: step.durationMin,
        transitionMin: step.transition?.durationMin ?? null,
        hours: step.isLocked ? [] : step.place.hours,
      }));
      return computeTimeline(steps, new Date(startsAt), 'Europe/Paris');
    },
  };
}

/**
 * Ids of the recette that fail, to see the error states on a device (`widoo://route/<id>`):
 * offline, a server error, and a loading that lasts.
 */
export const recetteFailures: Record<string, FixtureFailure> = {
  'recette-hors-connexion': { kind: 'network', delayMs: 300 },
  'recette-erreur': { kind: 'server', delayMs: 300 },
  'recette-chargement': { kind: 'network', delayMs: 60_000 },
};

/** The demo route sheets of `pnpm --filter api fixtures:route-sheets`, until #36. */
export const fixtureSource = createFixtureSource(fixtures, {
  latencyMs: 300,
  timelineLatencyMs: 100,
  failures: recetteFailures,
});
