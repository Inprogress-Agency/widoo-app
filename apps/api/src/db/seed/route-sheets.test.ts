import { RouteDetail } from '@widoo/shared';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { demoRouteIds } from '../seed';
import { routeSheetFixtures, routeSheetFixturesPath } from './route-sheets';

const fixtures = await routeSheetFixtures();

describe('route sheet fixtures', () => {
  it('are the ones the app reads: run pnpm fixtures:route-sheets after a change', () => {
    expect(JSON.parse(readFileSync(routeSheetFixturesPath, 'utf8'))).toEqual(fixtures);
  });

  it('answer every demo route under its seed id, as GET /v1/routes/:id would', () => {
    expect(fixtures.routes.slice(0, demoRouteIds.length).map((sheet) => sheet.id)).toEqual(
      demoRouteIds,
    );
    for (const sheet of fixtures.routes) {
      expect(RouteDetail.safeParse(sheet).error).toBeUndefined();
    }
  });

  it('show the states of the sheet: Premium locked, private, a reported place (D-014)', () => {
    const states = fixtures.routes.slice(demoRouteIds.length);
    expect(states.map((sheet) => [sheet.isLocked, sheet.status, sheet.sharedBy])).toEqual([
      [true, 'published', null],
      [false, 'private', { firstName: 'Camille' }],
      [false, 'published', null],
    ]);
    const flagged = states[2]?.steps[1];
    expect(flagged).toMatchObject({ verification: { reports: { count: 3 } } });
    expect(fixtures.removed).toHaveLength(1);
  });

  it('time each step after the trip from the previous one', () => {
    const [first, second] = fixtures.routes[0]?.timeline.steps ?? [];
    const step = fixtures.routes[0]?.steps[0];
    const trip = step && !step.isLocked ? (step.transition?.durationMin ?? 0) : 0;
    expect(Date.parse(second?.arrivesAt ?? '') - Date.parse(first?.leavesAt ?? '')).toBe(
      trip * 60_000,
    );
  });
});
