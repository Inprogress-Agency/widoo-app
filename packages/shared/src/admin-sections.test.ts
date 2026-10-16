import { describe, expect, it } from 'vitest';
import {
  adminSections,
  adminSectionsOf,
  canOpenAdminSection,
  countedAdminSections,
  isTeamRole,
  type AdminSection,
} from './admin-sections';
import { taxonomies, type UserRole } from './taxonomies';

// The matrix of the wiki (Admin-Web › Rôles), row by row: editor, moderator, admin.
const matrix: Record<AdminSection, [boolean, boolean, boolean]> = {
  dashboard: [true, true, true],
  moderation: [false, true, true],
  reports: [false, true, true],
  catalog: [true, true, true],
  users: [false, true, true],
  aiDrafts: [true, false, true],
  translations: [true, true, true],
  affiliation: [true, false, true],
  b2bClients: [true, false, true],
  settings: [false, false, true],
  actionLog: [false, false, true],
  support: [false, true, true],
};

describe('canOpenAdminSection', () => {
  it.each(adminSections)('follows the matrix of the wiki for %s', (section) => {
    const teamRoles = ['editor', 'moderator', 'admin'] as const;
    expect(teamRoles.map((role) => canOpenAdminSection(role, section))).toEqual(matrix[section]);
  });

  it.each(adminSections)('refuses %s to a user', (section) => {
    expect(canOpenAdminSection('user', section)).toBe(false);
  });
});

describe('adminSectionsOf', () => {
  it('gives nothing to a user', () => {
    expect(adminSectionsOf('user')).toEqual([]);
  });

  it('gives an editor its sections only, in the order of the admin', () => {
    expect(adminSectionsOf('editor')).toEqual([
      'dashboard',
      'catalog',
      'aiDrafts',
      'translations',
      'affiliation',
      'b2bClients',
    ]);
  });

  it('gives a moderator its sections only', () => {
    expect(adminSectionsOf('moderator')).toEqual([
      'dashboard',
      'moderation',
      'reports',
      'catalog',
      'users',
      'translations',
      'support',
    ]);
  });

  it('gives an admin every section', () => {
    expect(adminSectionsOf('admin')).toEqual([...adminSections]);
  });
});

describe('isTeamRole', () => {
  it('holds for every role but user', () => {
    const teamRoles = taxonomies.userRoles.filter((role: UserRole) => isTeamRole(role));
    expect(teamRoles).toEqual(['editor', 'moderator', 'admin']);
  });
});

describe('countedAdminSections', () => {
  it('lists the counters of the navigation (wiki Admin-Web › Modèles communs)', () => {
    expect(countedAdminSections).toEqual([
      'moderation',
      'reports',
      'support',
      'aiDrafts',
      'translations',
    ]);
  });
});
