import { ApiRequestError } from '@widoo/api-client';
import { RouteDetail, type PlannedRoute, type RouteDetailStep } from '@widoo/shared';
import { describe, expect, it, vi } from 'vitest';
import { i18next } from '../i18n';
import fixtures from '../route/generated/route-sheets.json';
import { submitPlan, type SubmitPlanDeps } from './submitPlan';

const marais = RouteDetail.parse(fixtures.routes[0]);
// A fictitious booking on the second step.
const route = {
  ...marais,
  steps: marais.steps.map((step, index) =>
    index === 1 ? { ...(step as RouteDetailStep), bookingRequired: true } : step,
  ),
};
const bookingId = route.steps[1]?.id ?? '';
const now = new Date('2026-09-25T08:00:00Z');
const choice = {
  route,
  planned: null,
  day: '2026-09-26',
  minute: 600,
  checked: new Set([bookingId]),
  notice: null,
};

function deps(overrides: Partial<SubmitPlanDeps> = {}): SubmitPlanDeps {
  return {
    t: i18next.t,
    create: vi.fn(async () => ({}) as PlannedRoute),
    update: vi.fn(async () => ({}) as PlannedRoute),
    trackPlanned: vi.fn(),
    trackChanged: vi.fn(),
    toast: vi.fn(),
    onSee: vi.fn(),
    now,
    ...overrides,
  };
}

describe('submitPlan', () => {
  it('plans the route with its ticked bookings, tracks it and says so', async () => {
    const given = deps();
    await expect(submitPlan(choice, given)).resolves.toBe(true);
    expect(given.create).toHaveBeenCalledWith(
      { routeId: route.id, startsAt: '2026-09-26T10:00:00+02:00' },
      [{ stepId: bookingId, isChecked: true }],
    );
    expect(given.trackPlanned).toHaveBeenCalledWith({
      route_id: route.id,
      days_ahead: 1,
      has_conflicts: false,
      bookings_count: 1,
      source: 'route',
    });
    expect(given.toast).toHaveBeenCalledWith('success', 'Sortie programmée', {
      subtitle: 'Samedi 26 septembre à 10:00',
      action: { label: 'Voir', onPress: expect.any(Function) },
      isAboveStickyBar: true,
    });
  });

  it('brings an outing not done back at the new date, as planned from the past', async () => {
    const saved = { id: 'missed-1' } as PlannedRoute;
    const given = deps({ rescheduledId: 'missed-1', update: vi.fn(async () => saved) });
    await expect(submitPlan(choice, given)).resolves.toBe(true);
    expect(given.create).not.toHaveBeenCalled();
    expect(given.update).toHaveBeenCalledWith('missed-1', {
      status: 'planned',
      startsAt: '2026-09-26T10:00:00+02:00',
      checklist: [{ stepId: bookingId, isChecked: true }],
    });
    expect(given.trackPlanned).toHaveBeenCalledWith(expect.objectContaining({ source: 'past' }));
    const options = vi.mocked(given.toast).mock.calls[0]?.[2];
    options?.action?.onPress();
    expect(given.onSee).toHaveBeenCalledWith(saved);
  });

  it('moves a planning and counts the days it moved', async () => {
    const given = deps();
    const planned = { id: 'planned-1', startsAt: '2026-09-27T08:00:00Z' } as PlannedRoute;
    await submitPlan({ ...choice, planned, day: '2026-09-26', minute: 660 }, given);
    expect(given.update).toHaveBeenCalledWith('planned-1', {
      startsAt: '2026-09-26T11:00:00+02:00',
      checklist: [{ stepId: bookingId, isChecked: true }],
    });
    expect(given.trackChanged).toHaveBeenCalledWith({ route_id: route.id, days_moved: -1 });
    expect(given.toast).toHaveBeenCalledWith('success', 'Sortie déplacée', expect.anything());
  });

  it('keeps the sheet open on a failure, and names a Premium route', async () => {
    const premium = new ApiRequestError('http', 402, {
      code: 'premium_required',
      message: 'Premium',
    });
    const given = deps({ create: vi.fn(async () => Promise.reject(premium)) });
    await expect(submitPlan(choice, given)).resolves.toBe(false);
    expect(given.trackPlanned).not.toHaveBeenCalled();
    expect(given.toast).toHaveBeenCalledWith('error', "La sortie n'a pas été programmée", {
      subtitle: 'Ce parcours est réservé à Premium.',
      isAboveStickyBar: true,
    });
  });
});
