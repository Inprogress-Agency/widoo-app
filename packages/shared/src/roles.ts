import type { UserRole } from './taxonomies';

/**
 * Roles each role holds (wiki Compte-et-Monetisation › Authentification, API › Admin). `admin`
 * holds every role. `editor` (Widoo team, publishes without moderation) and `moderator` are
 * distinct: the wiki gives neither the rights of the other, so neither implies the other.
 */
const heldRoles = {
  user: ['user'],
  editor: ['user', 'editor'],
  moderator: ['user', 'moderator'],
  admin: ['user', 'editor', 'moderator', 'admin'],
} as const satisfies Record<UserRole, readonly UserRole[]>;

/** True when a user whose role is `role` may act as `required`. */
export function hasRole(role: UserRole, required: UserRole): boolean {
  const held: readonly UserRole[] = heldRoles[role];
  return held.includes(required);
}
