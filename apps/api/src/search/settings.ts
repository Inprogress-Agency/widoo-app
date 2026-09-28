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
 * A value read from `settings` and kept one minute per process, so that a change applies without
 * a deployment. `parse` turns a missing or invalid value into its default.
 */
export function createCachedSetting<T>(
  read: () => Promise<unknown>,
  parse: (value: unknown) => T,
  now: () => number = () => Date.now(),
) {
  let cached: { value: T; readAt: number } | undefined;
  return async (): Promise<T> => {
    if (cached && now() - cached.readAt < refreshMs) return cached.value;
    cached = { value: parse(await read()), readAt: now() };
    return cached.value;
  };
}

/** Cluster threshold, from `settings` or the default. */
export function createClusterThreshold(
  read: () => Promise<unknown>,
  now: () => number = () => Date.now(),
) {
  return createCachedSetting(
    read,
    (value) => {
      const parsed = AreaKm2.safeParse(value);
      return parsed.success ? parsed.data : defaultClusterAreaKm2;
    },
    now,
  );
}
