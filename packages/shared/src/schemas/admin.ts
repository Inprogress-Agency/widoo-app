import { z } from 'zod';
import { countedAdminSections } from '../admin-sections';

/** Hours after which something waiting in the admin is late (wiki Creation-et-Moderation). */
export const adminLateAfterHours = 72;

/** What waits in a section: how many, and how many of them for more than 72 hours. */
export const AdminCounter = z.object({
  count: z.number().int().nonnegative(),
  lateCount: z.number().int().nonnegative(),
});
export type AdminCounter = z.infer<typeof AdminCounter>;

/**
 * Body of `GET /admin/counters`: the counters of the navigation, for the sections the role of
 * the caller opens. A section is absent when the role does not open it, or while the API does
 * not count it yet.
 */
export const AdminCounters = z.partialRecord(z.enum(countedAdminSections), AdminCounter);
export type AdminCounters = z.infer<typeof AdminCounters>;

const count = z.number().int().nonnegative();

/** A tile « à traiter » of the dashboard: a counter, and since when its oldest item waits. */
export const AdminToHandle = AdminCounter.extend({
  /** Null when nothing waits. */
  oldestSince: z.iso.datetime().nullable(),
});
export type AdminToHandle = z.infer<typeof AdminToHandle>;

/**
 * Body of `GET /admin/stats`, the figures of the dashboard (A-05). `toHandle` holds the sections
 * the role of the caller opens and the API counts; the other figures are the same for the team.
 */
export const AdminStats = z.object({
  toHandle: z.partialRecord(z.enum(countedAdminSections), AdminToHandle),
  catalog: z.object({
    publishedRoutes: count,
    /** Among the published routes. */
    premiumRoutes: count,
    officialRoutes: count,
    /** Places that at least one route goes through. */
    placesInRoutes: count,
    /** Cities with at least one published route. */
    cities: count,
    /** Authors who created or changed a route in the last 30 days. */
    activeCreators: count,
  }),
  users: z.object({
    registered: count,
    newLast7Days: count,
    /** Accounts whose Premium plan runs now, subscription or pass. */
    premiumActive: count,
    /** Always 0 until unit unlocks exist (`route_unlocks`). */
    unlocksLast30Days: count,
  }),
  generatedAt: z.iso.datetime(),
});
export type AdminStats = z.infer<typeof AdminStats>;
