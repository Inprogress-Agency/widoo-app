import type { PlannedRoute } from '@widoo/shared';
import { describe, expect, it, vi } from 'vitest';
import { startGo, type StartGoDeps } from './startGo';
import { plannedFixture } from './testPlanned';

const now = new Date('2026-10-24T08:00:00.000Z');
const routeId = '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e40';

function deps(overrides: Partial<StartGoDeps> = {}) {
  const go = plannedFixture();
  return {
    current: vi.fn(async (): Promise<PlannedRoute | null> => null),
    plannedOf: vi.fn(async (): Promise<PlannedRoute | null> => null),
    create: vi.fn(async () => ({ ...go, id: 'created', status: 'planned' as const })),
    update: vi.fn(async (id: string) => ({ ...go, id })),
    confirmReplace: vi.fn(async () => true),
    trackStarted: vi.fn(),
    trackStopped: vi.fn(),
    now: () => now,
    ...overrides,
  };
}

describe('startGo', () => {
  it('plans a route now, then starts it', async () => {
    const d = deps();
    await expect(startGo(routeId, d)).resolves.toMatchObject({ id: 'created' });
    expect(d.create).toHaveBeenCalledWith({ routeId, startsAt: now.toISOString() });
    expect(d.update).toHaveBeenCalledWith('created', { status: 'in_progress' });
    expect(d.trackStarted).toHaveBeenCalledWith({ route_id: routeId, was_planned: false });
  });

  it('starts the planning of a planned route, moved to now', async () => {
    const planned = { ...plannedFixture(), id: 'planned', status: 'planned' as const };
    const d = deps({ plannedOf: vi.fn(async () => planned) });
    await startGo(routeId, d);
    expect(d.create).not.toHaveBeenCalled();
    expect(d.update).toHaveBeenCalledWith('planned', {
      status: 'in_progress',
      startsAt: now.toISOString(),
    });
    expect(d.trackStarted).toHaveBeenCalledWith({ route_id: routeId, was_planned: true });
  });

  it('reopens the Go of the same route', async () => {
    const current = plannedFixture();
    const d = deps({ current: vi.fn(async () => current) });
    await expect(startGo(current.route.id, d)).resolves.toBe(current);
    expect(d.update).not.toHaveBeenCalled();
    expect(d.trackStarted).not.toHaveBeenCalled();
  });

  it('stops the other Go after « Arrêter et lancer »', async () => {
    const current = plannedFixture({ 0: { doneAt: now.toISOString() } });
    const d = deps({ current: vi.fn(async () => current) });
    await startGo(routeId, d);
    expect(d.confirmReplace).toHaveBeenCalledWith('Parcours fictif');
    expect(d.update).toHaveBeenNthCalledWith(1, current.id, { status: 'stopped' });
    expect(d.trackStopped).toHaveBeenCalledWith({
      route_id: current.route.id,
      steps_done_ratio: 1 / 3,
    });
    expect(d.trackStarted).toHaveBeenCalled();
  });

  it('keeps the other Go on « Annuler »', async () => {
    const d = deps({
      current: vi.fn(async () => plannedFixture()),
      confirmReplace: vi.fn(async () => false),
    });
    await expect(startGo(routeId, d)).resolves.toBeNull();
    expect(d.update).not.toHaveBeenCalled();
    expect(d.create).not.toHaveBeenCalled();
  });
});
