import { describe, expect, it } from 'vitest';
import { allowedUserActions, GiftBody } from './admin-users';

const admin = { id: 'a', role: 'admin' } as const;

describe('allowedUserActions', () => {
  it('gives an admin everything on a user, but nothing destructive on themselves', () => {
    expect(allowedUserActions(admin, { id: 'u', role: 'user' })).toEqual([
      'gift',
      'certification',
      'export',
      'role',
      'suspend',
      'delete',
    ]);
    expect(allowedUserActions(admin, admin)).toEqual(['gift', 'certification', 'export']);
  });

  it('asks an account of the team to be demoted before it is deleted', () => {
    expect(allowedUserActions(admin, { id: 'e', role: 'editor' })).not.toContain('delete');
  });

  it('lets a moderator suspend a user only', () => {
    const moderator = { id: 'm', role: 'moderator' } as const;
    expect(allowedUserActions(moderator, { id: 'u', role: 'user' })).toEqual(['suspend']);
    expect(allowedUserActions(moderator, { id: 'e', role: 'editor' })).toEqual([]);
    expect(allowedUserActions(moderator, { id: 'x', role: 'moderator' })).toEqual([]);
    expect(allowedUserActions(moderator, admin)).toEqual([]);
    expect(allowedUserActions(moderator, moderator)).toEqual([]);
  });

  it('gives nothing to an editor or a user', () => {
    expect(allowedUserActions({ id: 'e', role: 'editor' }, { id: 'u', role: 'user' })).toEqual([]);
    expect(allowedUserActions({ id: 'u', role: 'user' }, { id: 'v', role: 'user' })).toEqual([]);
  });
});

describe('GiftBody', () => {
  it('takes a date or a route, never both nor none', () => {
    const until = '2026-12-01T00:00:00.000Z';
    const routeId = '0199d1ec-0000-7000-8000-000000000000';
    expect(GiftBody.safeParse({ until }).success).toBe(true);
    expect(GiftBody.safeParse({ routeId }).success).toBe(true);
    expect(GiftBody.safeParse({ until, routeId }).success).toBe(false);
    expect(GiftBody.safeParse({}).success).toBe(false);
  });
});
