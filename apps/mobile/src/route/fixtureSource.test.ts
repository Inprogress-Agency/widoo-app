import { ApiRequestError } from '@widoo/api-client';
import { describe, expect, it } from 'vitest';
import { createFixtureSource, fixtureSource } from './fixtureSource';
import fixtures from './generated/route-sheets.json';

const source = createFixtureSource(fixtures, {
  latencyMs: 0,
  timelineLatencyMs: 0,
  failures: { offline: { kind: 'network', delayMs: 0 }, broken: { kind: 'server', delayMs: 0 } },
});

describe('fixture source of the route sheet', () => {
  it('answers each demo sheet, checked by the shared schema', async () => {
    for (const { id } of fixtures.routes) {
      await expect(source.getRoute(id)).resolves.toMatchObject({ kind: 'route', route: { id } });
    }
  });

  it('answers the date of a withdrawn route', async () => {
    const [removed] = fixtures.removed;
    await expect(source.getRoute(removed?.id ?? '')).resolves.toEqual({
      kind: 'removed',
      removedAt: removed?.removedAt,
    });
  });

  it('fails as the API client would: unknown id, no network, server error', async () => {
    await expect(source.getRoute('unknown')).rejects.toMatchObject({
      status: 404,
      code: 'not_found',
    });
    await expect(source.getRoute('offline')).rejects.toMatchObject({ kind: 'network' });
    await expect(source.getRoute('broken')).rejects.toBeInstanceOf(ApiRequestError);
  });

  it('refuses a sheet the schema does not accept', async () => {
    const broken = createFixtureSource(
      { routes: [{ ...fixtures.routes[0], effort: 'hard' }], removed: [] },
      { latencyMs: 0, timelineLatencyMs: 0, failures: {} },
    );
    await expect(broken.getRoute(fixtures.routes[0]?.id ?? '')).rejects.toMatchObject({
      kind: 'invalid_response',
    });
  });

  it('stops waiting when the request is cancelled', async () => {
    const controller = new AbortController();
    const pending = fixtureSource.getRoute('recette-chargement', { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toBeDefined();
  });

  it('computes the timeline of a start, with the conflicts of the hours', async () => {
    const id = fixtures.routes[0]?.id ?? '';
    // Monday: the museums of the Marais are closed.
    const timeline = await source.getTimeline(id, '2026-09-28T10:00:00+02:00');
    expect(timeline.startsAt).toBe('2026-09-28T08:00:00.000Z');
    expect(timeline.steps[0]?.conflicts).toEqual(['closed_that_day']);
    const tuesday = await source.getTimeline(id, '2026-09-29T10:00:00+02:00');
    expect(tuesday.steps.every((entry) => entry.conflicts.length === 0)).toBe(true);
    await expect(source.getTimeline('offline', tuesday.startsAt)).rejects.toMatchObject({
      kind: 'network',
    });
  });
});
