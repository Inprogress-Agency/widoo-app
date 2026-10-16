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
