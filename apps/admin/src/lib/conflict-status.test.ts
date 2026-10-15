import { describe, expect, it } from 'vitest';
import { conflictStatusLabel } from './conflict-status';

describe('conflictStatusLabel', () => {
  it('names the status of a route, of a report and of a place', () => {
    expect(conflictStatusLabel({ status: 'published' })).toBe('Publié');
    expect(conflictStatusLabel({ status: 'accepted' })).toBe('Accepté');
    expect(conflictStatusLabel({ status: 'closed' })).toBe('Fermé');
  });

  it('gives nothing for other details', () => {
    expect(conflictStatusLabel({ status: 'nope' })).toBeNull();
    expect(conflictStatusLabel(undefined)).toBeNull();
  });
});
