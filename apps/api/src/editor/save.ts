/**
 * Saving what the author edited: into the route itself, or into the revision of a published
 * route, the published version staying online until the revision is validated.
 */
import {
  budgetBucketOf,
  durationBucketOf,
  isRevisionEditable,
  routeEditModeOf,
} from '@widoo/shared';
import { eq } from 'drizzle-orm';
import type { Tx } from '../db/client';
import { envelopeOf } from '../db/geography';
import { routeRevisions, routes } from '../db/schema';
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
      suggestedStart: content.suggestedStart,
      tips: content.tips,
      tipsHidden: content.tipsHidden,
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
 * Saves the content the author edited: into the route, or into the revision of a published
 * route, created on its first edit. 409 `conflict` while the route or its revision awaits
 * moderation, and for a refused or withdrawn route.
 */
export async function saveContent(
  tx: Tx,
  workspace: Workspace,
  content: RouteContent,
  now: Date,
): Promise<Workspace> {
  const { route, revision } = workspace;
  const mode = routeEditModeOf(route.status);
  if (mode === null) {
    throw conflict(`A ${route.status} route cannot be edited`, { status: route.status });
  }
  if (mode === 'in_place') {
    return { route: await writeInPlace(tx, route, content, now), revision: null, content };
  }
  if (revision && !isRevisionEditable(revision.status)) {
    throw conflict('The revision awaits moderation', { revisionStatus: revision.status });
  }
  if (revision) {
    await tx
      .update(routeRevisions)
      .set({ snapshot: content })
      .where(eq(routeRevisions.id, revision.id));
    return { route, revision: { ...revision, content }, content };
  }
  const [created] = await tx
    .insert(routeRevisions)
    .values({ routeId: route.id, authorId: route.authorId, snapshot: content })
    .returning({ id: routeRevisions.id });
  if (!created) throw new Error('Revision not created');
  return { route, revision: { id: created.id, status: 'draft', content }, content };
}
