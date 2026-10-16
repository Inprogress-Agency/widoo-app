import { adminSectionsOf, type AdminSection, type UserRole } from '@widoo/shared';

/** Address of each section. The dashboard is the home page of the admin. */
export const sectionPaths = {
  dashboard: '/',
  moderation: '/moderation',
  reports: '/signalements',
  support: '/support',
  catalog: '/catalogue',
  aiDrafts: '/brouillons-ia',
  translations: '/traductions',
  users: '/utilisateurs',
  affiliation: '/affiliation',
  b2bClients: '/partenaires',
  settings: '/reglages',
  actionLog: '/journal',
} as const satisfies Record<AdminSection, `/${string}`>;

/** Groups of the navigation, in the order of the board « Coque » (wiki Ecrans › Admin web). */
const navigationGroups = [
  { id: 'toHandle', sections: ['moderation', 'reports', 'support'] },
  { id: 'catalog', sections: ['catalog', 'aiDrafts', 'translations'] },
  { id: 'community', sections: ['users'] },
  { id: 'revenue', sections: ['affiliation', 'b2bClients'] },
  { id: 'administration', sections: ['settings', 'actionLog'] },
] as const satisfies readonly { id: string; sections: readonly AdminSection[] }[];

export type NavigationGroupId = (typeof navigationGroups)[number]['id'];

export type NavigationGroup = { id: NavigationGroupId; sections: AdminSection[] };

/**
 * The navigation of a role: the groups that hold at least one of its sections, each with these
 * sections only. The dashboard stands alone above the groups, so it is not part of them.
 */
export function navigationFor(role: UserRole): NavigationGroup[] {
  const opened = new Set(adminSectionsOf(role));
  return navigationGroups
    .map(({ id, sections }) => ({
      id,
      sections: sections.filter((section: AdminSection) => opened.has(section)),
    }))
    .filter((group) => group.sections.length > 0);
}

/**
 * The section a path belongs to: `/moderation/42` is in the moderation. Null outside every
 * section (a mistyped address).
 */
export function sectionOfPath(pathname: string): AdminSection | null {
  if (pathname === sectionPaths.dashboard) {
    return 'dashboard';
  }
  const entries = Object.entries(sectionPaths) as [AdminSection, string][];
  const match = entries.find(
    ([section, path]) =>
      section !== 'dashboard' && (pathname === path || pathname.startsWith(`${path}/`)),
  );
  return match ? match[0] : null;
}
