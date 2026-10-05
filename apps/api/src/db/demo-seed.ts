/**
 * The demo dataset of `seed.ts` on staging (#287), where the image sets NODE_ENV=production and
 * `db:seed` is refused. Two guards, both required: the opt-in `DEMO_SEED=staging`, and the Google
 * Cloud project the process runs in, read from the metadata server, which must be the staging
 * project. Production lives in another project (#246): it is refused even with the opt-in, and a
 * missing or unreadable project (a laptop, another host) is refused too.
 */
import type { Db } from './client';
import { seed } from './seed';

/** The only project where the demo dataset may be written. Code, not configuration. */
export const stagingProjectId = 'widoo-staging';
export const demoSeedOptIn = { name: 'DEMO_SEED', value: 'staging' } as const;
export const demoSeedActions = ['load'] as const;
export type DemoSeedAction = (typeof demoSeedActions)[number];

/** Google Cloud project ID rules: 6 to 30 lowercase letters, digits and hyphens. */
const ProjectId = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
// Fixed host: no environment variable can point the check at another server.
const projectIdUrl = 'http://metadata.google.internal/computeMetadata/v1/project/project-id';

/**
 * ID of the Google Cloud project of the process, from the metadata server of Cloud Run; null
 * when it does not answer as a metadata server (outside Google Cloud) or answers garbage.
 */
export async function gcpProjectId(fetchImpl: typeof fetch = fetch): Promise<string | null> {
  try {
    const response = await fetchImpl(projectIdUrl, {
      headers: { 'Metadata-Flavor': 'Google' },
      redirect: 'error',
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok || response.headers.get('Metadata-Flavor') !== 'Google') return null;
    const id = (await response.text()).trim();
    return ProjectId.test(id) ? id : null;
  } catch {
    return null;
  }
}

export interface DemoSeedTarget {
  /** Value of `DEMO_SEED`. */
  optIn: string | undefined;
  /** Result of `gcpProjectId()`. */
  projectId: string | null;
}

/** Why the demo dataset may not be written to this target, or null when it may. */
export function demoSeedRefusal({ optIn, projectId }: DemoSeedTarget): string | null {
  const { name, value } = demoSeedOptIn;
  if (optIn !== value) {
    return `${name}=${value} is required: the demo dataset is only written on purpose`;
  }
  if (projectId === null) {
    return `Google Cloud project unknown (no metadata server): staging only, refused`;
  }
  if (projectId !== stagingProjectId) {
    return `Google Cloud project ${projectId} is not ${stagingProjectId}: refused`;
  }
  return null;
}

export type DemoSeedResult = { action: 'load'; routes: number };

/** Loads the demo dataset after both guards; throws before any query otherwise. */
export async function runDemoSeed(
  action: DemoSeedAction,
  target: DemoSeedTarget,
  db: Db,
): Promise<DemoSeedResult> {
  const refusal = demoSeedRefusal(target);
  if (refusal !== null) throw new Error(`Demo dataset ${action}: ${refusal}`);
  const { routeIds } = await seed(db);
  return { action, routes: routeIds.length };
}
