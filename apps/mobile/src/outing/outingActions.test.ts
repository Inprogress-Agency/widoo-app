import type { PlannedRoute } from '@widoo/shared';
import { describe, expect, it, vi } from 'vitest';
import { i18next } from '../i18n';
import { cancelOuting, restoreOuting, type OutingActionDeps } from './outingActions';
import { dateCardText, daysAhead } from './outingText';

// A fictitious outing on Saturday 26 September, seen on Thursday 24.
const outing = {
  id: 'planned-1',
  routeId: 'route-1',
  status: 'planned',
  startsAt: '2026-09-26T08:00:00.000Z',
  route: { id: 'route-1', title: 'Montmartre sans les touristes' },
  timeline: { startsAt: '2026-09-26T08:00:00.000Z', endsAt: '2026-09-26T15:00:00.000Z' },
} as unknown as PlannedRoute;
const now = new Date('2026-09-24T10:00:00Z');

function deps(overrides: Partial<OutingActionDeps> = {}): OutingActionDeps {
  return {
    t: i18next.t,
    update: vi.fn(async () => outing),
    trackCancelled: vi.fn(),
    trackRestored: vi.fn(),
    toast: vi.fn(),
    onChanged: vi.fn(),
    onCancelled: vi.fn(),
    now: () => now,
    ...overrides,
  };
}

describe('dateCardText', () => {
  it('writes the day, the start and the end of the outing', () => {
    expect(dateCardText(i18next.t, outing, now)).toEqual({
      day: 'Samedi 26 septembre',
      hours: 'Départ 10:00, fin vers 17:00',
      spoken: 'Samedi 26 septembre, Départ 10:00, fin vers 17:00',
    });
  });
});

describe('daysAhead', () => {
  it('counts the days to the outing, never below zero', () => {
    expect(daysAhead(outing, now)).toBe(2);
    expect(daysAhead(outing, new Date('2026-09-27T10:00:00Z'))).toBe(0);
  });
});

describe('cancelOuting', () => {
  it('cancels the outing, tracks it and offers « Rétablir »', async () => {
    const given = deps();
    await expect(cancelOuting(outing, given)).resolves.toBe(true);
    expect(given.update).toHaveBeenCalledWith('planned-1', { status: 'cancelled' });
    expect(given.trackCancelled).toHaveBeenCalledWith({ route_id: 'route-1', days_ahead: 2 });
    expect(given.onCancelled).toHaveBeenCalledTimes(1);
    expect(given.onChanged).toHaveBeenCalledTimes(1);
    const [kind, title, options] = vi.mocked(given.toast).mock.calls[0] ?? [];
    expect([kind, title, options?.subtitle]).toEqual([
      'success',
      'Sortie annulée',
      'Montmartre sans les touristes',
    ]);
    expect(options?.action?.label).toBe('Rétablir');

    options?.action?.onPress();
    await vi.waitFor(() => expect(given.trackRestored).toHaveBeenCalled());
    expect(given.update).toHaveBeenLastCalledWith('planned-1', { status: 'planned' });
    expect(given.trackRestored).toHaveBeenCalledWith({ route_id: 'route-1', days_ahead: 2 });
    expect(given.onCancelled).toHaveBeenCalledTimes(1);
    expect(given.onChanged).toHaveBeenCalledTimes(2);
  });

  it('keeps the outing and says so when the cancel fails', async () => {
    const given = deps({ update: vi.fn(async () => Promise.reject(new Error('offline'))) });
    await expect(cancelOuting(outing, given)).resolves.toBe(false);
    expect(given.trackCancelled).not.toHaveBeenCalled();
    expect(given.onCancelled).not.toHaveBeenCalled();
    expect(given.toast).toHaveBeenCalledWith(
      'error',
      "La sortie n'a pas pu être annulée",
      expect.objectContaining({ subtitle: 'Vérifiez la connexion, puis réessayez.' }),
    );
  });
});

describe('restoreOuting', () => {
  it('names the id of a deleted route from its snapshot', async () => {
    const given = deps();
    await restoreOuting({ ...outing, routeId: null }, given);
    expect(given.trackRestored).toHaveBeenCalledWith({ route_id: 'route-1', days_ahead: 2 });
  });

  it('says so when the outing cannot come back', async () => {
    const given = deps({ update: vi.fn(async () => Promise.reject(new Error('409'))) });
    await expect(restoreOuting(outing, given)).resolves.toBe(false);
    expect(given.trackRestored).not.toHaveBeenCalled();
  });
});
