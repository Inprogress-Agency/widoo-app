/** Saving what the author edited into the route itself. */
import { budgetBucketOf, durationBucketOf, routeEditModeOf } from '@widoo/shared';
import { eq } from 'drizzle-orm';
import type { Tx } from '../db/client';
import { envelopeOf } from '../db/geography';
import { routes } from '../db/schema';
import { conflict } from '../errors';
import { mainTransportOf, replaceSteps, type RouteContent } from './content';
import type { RouteRow } from './lifecycle';
import { evaluate, type Workspace } from './workspace';

/**
 * Writes the content into the route itself, with what is derived from it: stored trips, transport,
 * start, envelope, city of the first step, `computed` and its buckets.
 */
export async function writeInPlace(
  tx: Tx,
  route: RouteRow,
  content: RouteContent,
  now: Date,
): Promise<RouteRow> {
  const { placeById, transitions, evaluation } = await evaluate(tx, route.id, content, now);
  await replaceSteps(tx, route.id, content, transitions);
  const located = content.steps.flatMap((step) => {
    const place = placeById.get(step.placeId);
    return place ? [place] : [];
  });
  const { computed, warnings } = evaluation;
  const [written] = await tx
    .update(routes)
    .set({
      title: content.title,
      description: content.description,
      moods: content.moods,
      audiences: content.audiences,
      conditions: content.conditions,
      transport: mainTransportOf(transitions),
      startLocation: located[0]?.location ?? null,
      bounds: located.length > 0 ? envelopeOf(located.map((place) => place.location)) : null,
      cityId: located[0]?.cityId ?? route.cityId,
      // Snake case, as the search reads it.
      computed: computed && {
        duration_min: computed.durationMin,
        budget_per_person_eur: computed.budgetPerPersonEur,
        distance_m: computed.distanceM,
        walking_m: computed.walkingM,
        effort: computed.effort,
        warnings: warnings.map((issue) => issue.code),
        computed_at: computed.computedAt,
      },
      durationBucket: computed && durationBucketOf(computed.durationMin),
      budgetBucket: computed && budgetBucketOf(computed.budgetPerPersonEur),
    })
    .where(eq(routes.id, route.id))
    .returning();
  if (!written) throw new Error(`Route ${route.id} vanished while locked`);
  return written;
}

/**
 * Saves the content the author edited into the route. 409 `conflict` for a route awaiting
 * moderation, refused or withdrawn, and for a published route, which is edited through a
 * revision.
 */
export async function saveContent(
  tx: Tx,
  workspace: Workspace,
  content: RouteContent,
  now: Date,
): Promise<Workspace> {
  const { route } = workspace;
  if (routeEditModeOf(route.status) !== 'in_place') {
    throw conflict(`A ${route.status} route cannot be edited`, { status: route.status });
  }
  return { route: await writeInPlace(tx, route, content, now), revision: null, content };
}
