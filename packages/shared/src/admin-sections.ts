import type { UserRole } from './taxonomies';

/** Roles of the Widoo team: the only ones the admin lets in (wiki Admin-Web › Rôles). */
export type TeamRole = Exclude<UserRole, 'user'>;

/** Sections of the admin, in the order of its screens A-02 to A-13, the dashboard (A-05) first. */
export const adminSections = [
  'dashboard',
  'moderation',
  'reports',
  'catalog',
  'users',
  'aiDrafts',
  'translations',
  'affiliation',
  'b2bClients',
  'settings',
  'actionLog',
  'support',
] as const;

export type AdminSection = (typeof adminSections)[number];

/**
 * Who opens each section (wiki Admin-Web › Rôles): a role is listed as soon as the matrix gives
 * it anything there, read only included. What a role may do inside a section (a moderator only
 * reads the catalog, an editor only sees the team's routes) is decided by each route of the API.
 * Written out for `admin` too, rather than derived from `hasRole`: `editor` and `moderator` do
 * not imply each other, and the matrix is the reference.
 */
const sectionRoles = {
  dashboard: ['editor', 'moderator', 'admin'],
  moderation: ['moderator', 'admin'],
  reports: ['moderator', 'admin'],
  catalog: ['editor', 'moderator', 'admin'],
  users: ['moderator', 'admin'],
  aiDrafts: ['editor', 'admin'],
  translations: ['editor', 'moderator', 'admin'],
  affiliation: ['editor', 'admin'],
  b2bClients: ['editor', 'admin'],
  settings: ['admin'],
  actionLog: ['admin'],
  support: ['moderator', 'admin'],
} as const satisfies Record<AdminSection, readonly TeamRole[]>;

/** True for a member of the team: `editor`, `moderator` or `admin`. */
export function isTeamRole(role: UserRole): role is TeamRole {
  return role !== 'user';
}

/** True when `role` opens `section`. The API decides; the admin only hides what is refused. */
export function canOpenAdminSection(role: UserRole, section: AdminSection): boolean {
  const roles: readonly UserRole[] = sectionRoles[section];
  return roles.includes(role);
}

/** The sections `role` opens, in the order of `adminSections`; none for a `user`. */
export function adminSectionsOf(role: UserRole): AdminSection[] {
  return adminSections.filter((section) => canOpenAdminSection(role, section));
}

/** Sections whose navigation entry carries a "to handle" counter (`GET /admin/counters`). */
export const countedAdminSections = [
  'moderation',
  'reports',
  'support',
  'aiDrafts',
  'translations',
] as const satisfies readonly AdminSection[];

export type CountedAdminSection = (typeof countedAdminSections)[number];
