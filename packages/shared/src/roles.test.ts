import { describe, expect, it } from 'vitest';
import { hasRole } from './roles';
import { taxonomies, type UserRole } from './taxonomies';

// Rows: role of the user. Columns: required role, in taxonomy order (user, editor, moderator, admin).
const expected: Record<UserRole, [boolean, boolean, boolean, boolean]> = {
  user: [true, false, false, false],
  editor: [true, true, false, false],
  moderator: [true, false, true, false],
  admin: [true, true, true, true],
};

describe('hasRole', () => {
  it.each(taxonomies.userRoles)('grants %s exactly its own rights', (role) => {
    expect(taxonomies.userRoles.map((required) => hasRole(role, required))).toEqual(expected[role]);
  });
});
