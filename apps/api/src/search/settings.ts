import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../db/client';
import { settings } from '../db/schema';

/** Key of the `settings` row: above this zone surface, the search answers clusters. */
export const clusterAreaKey = 'search.cluster_area_km2';
/** About 6 × 6 km: the initial map (about 3 km) lists routes, a view of all Paris clusters them. */
export const defaultClusterAreaKm2 = 40;
const refreshMs = 60_000;

const AreaKm2 = z.number().positive();

/** Value of a `settings` row, undefined when absent. */
export async function readSetting(db: Db, key: string): Promise<unknown> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key));
  return row?.value;
}

/**
 * Cluster threshold, read from `settings` and kept one minute per process, so that a change
 * applies without a deployment. A missing or invalid value falls back to the default.
 */
export function createClusterThreshold(read: () => Promise<unknown>, now: () => number = Date.now) {
  let cached: { value: number; readAt: number } | undefined;
  return async (): Promise<number> => {
    if (cached && now() - cached.readAt < refreshMs) return cached.value;
    const parsed = AreaKm2.safeParse(await read());
    cached = { value: parsed.success ? parsed.data : defaultClusterAreaKm2, readAt: now() };
    return cached.value;
  };
}
