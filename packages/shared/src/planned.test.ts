import { describe, expect, it } from 'vitest';
import {
  CreatePlannedRoute,
  plannedRouteStatuses,
  PlannedRouteQuery,
  settablePlannedRouteStatuses,
  UpdatePlannedRoute,
} from '.';

// Fictitious identifiers only.
const stepId = '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e10';
const routeId = '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e11';

describe('planned route statuses', () => {
  it('carry stopped and missed (D-029, D-038), and leave missed to the job', () => {
    expect(plannedRouteStatuses).toContain('stopped');
    expect(plannedRouteStatuses).toContain('missed');
    expect(settablePlannedRouteStatuses).not.toContain('missed');
  });
});

describe('CreatePlannedRoute', () => {
  it('takes a route and a start with its offset', () => {
    const body = { routeId, startsAt: '2026-10-24T10:00:00+02:00' };
    expect(CreatePlannedRoute.parse(body)).toEqual(body);
  });

  it('refuses an unknown key, a local time and a malformed id', () => {
    const startsAt = '2026-10-24T08:00:00Z';
    expect(CreatePlannedRoute.safeParse({ routeId, startsAt, note: 'x' }).success).toBe(false);
    expect(CreatePlannedRoute.safeParse({ routeId, startsAt: '2026-10-24T10:00' }).success).toBe(
      false,
    );
    expect(CreatePlannedRoute.safeParse({ routeId: 'route-1', startsAt }).success).toBe(false);
  });
});

describe('UpdatePlannedRoute', () => {
  it('takes a date, a settable status and ticked bookings', () => {
    const body = {
      startsAt: '2026-10-25T08:00:00Z',
      status: 'planned',
      checklist: [{ stepId, isChecked: true }],
    };
    expect(UpdatePlannedRoute.parse(body)).toEqual(body);
  });

  it('refuses an empty body, the personal note, missed and a step named twice', () => {
    expect(UpdatePlannedRoute.safeParse({}).success).toBe(false);
    expect(UpdatePlannedRoute.safeParse({ personalNote: 'x' }).success).toBe(false);
    expect(UpdatePlannedRoute.safeParse({ status: 'missed' }).success).toBe(false);
    const twice = [
      { stepId, isChecked: true },
      { stepId, isChecked: false },
    ];
    expect(UpdatePlannedRoute.safeParse({ checklist: twice }).success).toBe(false);
  });
});

describe('PlannedRouteQuery', () => {
  it('defaults the page size and refuses an unknown status', () => {
    expect(PlannedRouteQuery.parse({})).toEqual({ limit: 20 });
    expect(PlannedRouteQuery.safeParse({ status: 'done' }).success).toBe(false);
  });
});
