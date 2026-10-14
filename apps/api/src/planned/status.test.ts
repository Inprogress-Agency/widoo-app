import { describe, expect, it } from 'vitest';
import { canMove, closingOf, isDatable } from './status';

describe('canMove', () => {
  it('brings back a cancelled or missed planning, and relaunches a stopped Go', () => {
    expect(canMove('cancelled', 'planned')).toBe(true);
    expect(canMove('missed', 'planned')).toBe(true);
    expect(canMove('stopped', 'in_progress')).toBe(true);
  });

  it('ends a Go only once started, and never reopens a completed one', () => {
    expect(canMove('planned', 'completed')).toBe(false);
    expect(canMove('planned', 'stopped')).toBe(false);
    expect(canMove('completed', 'planned')).toBe(false);
    expect(canMove('completed', 'in_progress')).toBe(false);
    expect(canMove('in_progress', 'cancelled')).toBe(false);
  });
});

describe('closingOf', () => {
  it('closes a completed or stopped Go by the user, and clears it otherwise', () => {
    const now = new Date('2026-10-24T15:00:00Z');
    expect(closingOf('completed', now)).toEqual({ completedAt: now, closedBy: 'user' });
    expect(closingOf('stopped', now)).toEqual({ completedAt: null, closedBy: 'user' });
    expect(closingOf('in_progress', now)).toEqual({ completedAt: null, closedBy: null });
  });
});

describe('isDatable', () => {
  it('dates a planning before or at its start only', () => {
    expect(isDatable('planned')).toBe(true);
    expect(isDatable('in_progress')).toBe(true);
    expect(isDatable('completed')).toBe(false);
  });
});
