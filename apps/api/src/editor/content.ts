/**
 * What the author edits of a route (E-11, E-12): its information and its ordered steps, read and
 * written in the route itself, or in the working copy of a published route (`route_revisions`).
 */
import { computeTransitions, type Transition } from '@widoo/orchestration';
import {
  LocalTime,
  StepInput,
  StepTransition,
  taxonomies,
  type RouteRevisionStatus,
  type Transport,
} from '@widoo/shared';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import type { Tx } from '../db/client';
import { routeRevisions, steps } from '../db/schema';
import type { RouteRow } from './lifecycle';

/** A stored step: the input, its id always set. */
const ContentStep = StepInput.extend({ id: z.uuid() });
export type ContentStep = z.infer<typeof ContentStep>;

/** `route_revisions.snapshot`, and the content of a route read from its rows. */
export const RouteContent = z.object({
  /** Empty until the author names the route. */
  title: z.string(),
  description: z.string().nullable(),
  moods: z.array(z.enum(taxonomies.moods)),
  audiences: z.array(z.enum(taxonomies.audiences)),
  conditions: z.array(z.enum(taxonomies.conditions)),
  // Defaults: a revision saved before migration 0013 has none of these (D-048, D-050).
  suggestedStart: LocalTime.nullable().default(null),
  tips: z.array(z.string()).default([]),
  tipsHidden: z.array(z.string()).default([]),
  steps: z.array(ContentStep),
});
export type RouteContent = z.infer<typeof RouteContent>;

export type OpenRevision = { id: string; status: RouteRevisionStatus; content: RouteContent };

/** The steps of a route as content, in order; the chosen mode is kept from the stored trip. */
async function stepsOf(tx: Tx, routeId: string): Promise<ContentStep[]> {
  const rows = await tx
    .select()
    .from(steps)
    .where(eq(steps.routeId, routeId))
    .orderBy(asc(steps.position));
  return rows.map((step) => ({
    id: step.id,
    placeId: step.placeId,
    title: step.title,
    description: step.description,
    highlights: step.highlights,
    durationMin: step.durationMin,
    costPerPersonEur: step.costPerPerson,
    bookingRequired: step.bookingRequired,
    bookingUrl: step.bookingUrl,
    bookingProvider: step.bookingProvider,
    bookingNote: step.bookingNote,
    bookingIsAffiliate: step.bookingIsAffiliate,
    endsOn: step.endsOn,
    transitionNote: step.transitionNote,
    transitionMode: StepTransition.safeParse(step.transition).data?.mode ?? null,
  }));
}

/** `HH:MM` of a Postgres `time`, read as `HH:MM:SS`. */
const localTimeOf = (time: string | null): string | null => time?.slice(0, 5) ?? null;

/** The content of the route itself, published version included. */
export async function routeContentOf(tx: Tx, route: RouteRow): Promise<RouteContent> {
  return {
    title: route.title,
    description: route.description,
    moods: route.moods,
    audiences: route.audiences,
    conditions: route.conditions,
    suggestedStart: localTimeOf(route.suggestedStart),
    tips: route.tips,
    tipsHidden: route.tipsHidden,
    steps: await stepsOf(tx, route.id),
  };
}

/** The open revision of a route (draft, pending or changes requested), locked; none if absent. */
export async function openRevisionOf(tx: Tx, routeId: string): Promise<OpenRevision | null> {
  const [row] = await tx
    .select()
    .from(routeRevisions)
    .where(
      and(
        eq(routeRevisions.routeId, routeId),
        inArray(routeRevisions.status, ['draft', 'pending', 'changes_requested']),
      ),
    )
    .for('update');
  return row ? { id: row.id, status: row.status, content: RouteContent.parse(row.snapshot) } : null;
}

/** The estimated trips of the steps (D-088): never an answer of Mapbox, which is not stored. */
export function transitionsOf(
  content: RouteContent,
  locations: ReadonlyMap<string, { lat: number; lng: number }>,
): Promise<(Transition | null)[]> {
  return computeTransitions(
    content.steps.map((step) => {
      const location = locations.get(step.placeId);
      if (!location) throw new Error(`Place ${step.placeId} of a step was not loaded`);
      return { location, mode: step.transitionMode };
    }),
    { directions: null, cache: null },
  );
}

/** Transport of a route: the mode of its trips that covers the most distance (D-048). */
export function mainTransportOf(transitions: readonly (Transition | null)[]): Transport {
  const byMode = new Map<Transport, number>();
  for (const trip of transitions) {
    if (trip) byMode.set(trip.mode, (byMode.get(trip.mode) ?? 0) + trip.distanceM);
  }
  let main: Transport = 'walk';
  for (const [mode, distanceM] of byMode) {
    if (distanceM > (byMode.get(main) ?? 0)) main = mode;
  }
  return main;
}

/** Replaces the steps of a route by the content's, their ids kept, their trips stored. */
export async function replaceSteps(
  tx: Tx,
  routeId: string,
  content: RouteContent,
  transitions: readonly (Transition | null)[],
): Promise<void> {
  await tx.delete(steps).where(eq(steps.routeId, routeId));
  if (content.steps.length === 0) return;
  await tx.insert(steps).values(
    content.steps.map((step, position) => {
      const trip = transitions[position];
      return {
        id: step.id,
        routeId,
        position,
        placeId: step.placeId,
        title: step.title,
        description: step.description,
        highlights: step.highlights,
        durationMin: step.durationMin,
        costPerPerson: step.costPerPersonEur,
        bookingRequired: step.bookingRequired,
        bookingUrl: step.bookingUrl,
        bookingProvider: step.bookingProvider,
        bookingNote: step.bookingNote,
        bookingIsAffiliate: step.bookingIsAffiliate,
        endsOn: step.endsOn,
        transitionNote: step.transitionNote,
        transition: trip && {
          distanceM: trip.distanceM,
          durationMin: trip.durationMin,
          mode: trip.mode,
          estimated: trip.estimated,
        },
      };
    }),
  );
}
