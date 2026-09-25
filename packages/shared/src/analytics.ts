import { z } from 'zod';
import { taxonomies } from './taxonomies';

/**
 * Product analytics events (wiki Analytics), sent by the app to PostHog once the user consents.
 * One strict schema per event: `track` refuses an event the page does not name, and a property
 * or a value outside its schema. Property names are the wire names. A value the wiki does not
 * enumerate stays a `string` until the screen that sends it is specified. Server events
 * (`moderation_decision`, `place_flagged`) join when the API sends events.
 *
 * No property carries a position (Securite-et-RGPD): the only place sent is the common `city`,
 * a slug, and the map sends its zoom level, never its zone.
 */

/** City slug of the explored area (`paris`): letters and hyphens, so never a coordinate. */
export const AnalyticsCity = z.string().regex(/^[a-z]+(?:-[a-z]+)*$/);

/** Sent with every event. PostHog adds `$session_id` itself. */
export const AnalyticsCommonProperties = z.strictObject({
  app_version: z.string().min(1),
  platform: z.enum(['ios', 'android']),
  city: AnalyticsCity,
  is_authenticated: z.boolean(),
});
export type AnalyticsCommonProperties = z.infer<typeof AnalyticsCommonProperties>;

/** Active filters, as technical keys. */
const filters = {
  audiences: z.array(z.enum(taxonomies.audiences)),
  moods: z.array(z.enum(taxonomies.moods)),
  conditions: z.array(z.enum(taxonomies.conditions)),
  durations: z.array(z.enum(taxonomies.durations)),
  budgets: z.array(z.enum(taxonomies.budgets)),
  transports: z.array(z.enum(taxonomies.transports)),
};
export type AnalyticsFilters = z.infer<z.ZodObject<typeof filters>>;

const id = z.string().min(1);
const count = z.number().int().nonnegative();
/** Share of the steps of a route, from 0 to 1. */
const ratio = z.number().min(0).max(1);
const route = { route_id: id };
const step = { ...route, step_index: count };
const authIntent = z.enum(['favorite', 'plan', 'go', 'create', 'signal']);
const purchase = z.strictObject({ plan: z.enum(['monthly', 'annual']) });
const createSaved = z.strictObject({ steps_count: count, warnings_count: count });
const bookingProvider = z.enum(taxonomies.bookingProviders);
const none = z.strictObject({});
const weatherBanner = z.strictObject({ condition: z.string() });
const routeOnly = z.strictObject(route);

export const analyticsEvents = {
  // Discovery
  app_opened: z.strictObject({ cold_start: z.boolean() }),
  map_search_zone: z.strictObject({
    zoom: z.number().min(0).max(24),
    results_count: count,
    trigger: z.enum(['initial', 'button', 'geocode']),
  }),
  filters_applied: z.strictObject({
    ...filters,
    results_count: count,
    source: z.enum(['chip', 'panel', 'weather']),
  }),
  filters_no_results: z.strictObject(filters),
  weather_banner_shown: weatherBanner,
  weather_banner_tapped: weatherBanner,
  search_text: z.strictObject({ kind: z.enum(['geo', 'route']), has_result: z.boolean() }),
  /** `position` from 0 in the carousel; `sheet_level` the detent of the sheet (E-04). */
  result_card_viewed: z.strictObject({
    ...route,
    position: count,
    sheet_level: z.enum(['rest', 'half', 'full']),
  }),
  route_opened: z.strictObject({
    ...route,
    source: z.enum(['marker', 'card', 'link', 'favorites', 'planned']),
  }),
  route_scrolled: z.strictObject({
    ...route,
    depth: z.enum(['info', 'timeline', 'steps', 'end']),
  }),
  route_shared: routeOnly,
  // Action
  auth_prompted: z.strictObject({ intent: authIntent }),
  auth_completed: z.strictObject({
    provider: z.enum(['apple', 'google', 'email']),
    intent: authIntent,
    is_new_user: z.boolean(),
  }),
  favorite_added: routeOnly,
  favorite_removed: routeOnly,
  route_planned: z.strictObject({
    ...route,
    days_ahead: count,
    has_conflicts: z.boolean(),
    bookings_count: count,
  }),
  plan_checklist_item_done: z.strictObject({ ...route, provider: bookingProvider }),
  booking_link_opened: z.strictObject({
    ...route,
    step_id: id,
    provider: bookingProvider,
    context: z.enum(['route', 'plan', 'go']),
  }),
  go_started: z.strictObject({ ...route, was_planned: z.boolean() }),
  maps_opened: z.strictObject({ ...route, mode: z.enum(['full', 'next_step']) }),
  /** D-029: `suggested` when the « Vous semblez être sur place » pill was shown. */
  go_arrived: z.strictObject({ ...step, suggested: z.boolean() }),
  go_step_done: z.strictObject(step),
  /** « Arrêter le parcours » (D-029). */
  go_stopped: z.strictObject({ ...route, steps_done_ratio: ratio }),
  /** « Passer cette étape » (D-033). */
  go_step_skipped: z.strictObject({
    ...step,
    reason: z.enum(['signaled', 'late', 'user']),
  }),
  go_completed: z.strictObject({
    ...route,
    duration_actual_min: count,
    steps_done_ratio: ratio,
    closed_by: z.enum(['user', 'auto']),
  }),
  route_rated: z.strictObject({
    ...route,
    rating: z.number().int().min(1).max(5),
    has_comment: z.boolean(),
    source: z.enum(['go_end', 'past']),
  }),
  creator_profile_opened: z.strictObject({ creator_id: id, source: z.string() }),
  /** D-023: `own` when the user opens the certification of their own profile. */
  certified_info_opened: z.strictObject({ creator_id: id, own: z.boolean() }),
  profile_updated: z.strictObject({
    fields: z.array(z.enum(['photo', 'bio', 'neighborhood', 'anecdotes', 'featured'])).nonempty(),
  }),
  paywall_shown: z.strictObject({
    reason: z.enum(['premium_route', 'create_limit', 'premium_card']),
    source: z.enum(['route', 'profile', 'profile_edit', 'settings', 'create', 'planned']),
  }),
  paywall_dismissed: purchase,
  purchase_started: purchase,
  purchase_completed: purchase,
  reminder_received: none,
  reminder_tapped: none,
  // Creation and quality
  create_started: none,
  create_step_added: z.strictObject({ place_source: z.enum(['existing', 'new']) }),
  create_coherence_warning: z.strictObject({ codes: z.array(z.string()) }),
  create_saved_private: createSaved,
  create_submitted: createSaved,
  place_confirmed: z.strictObject({ context: z.string() }),
  place_reported: z.strictObject({
    reason: z.enum(taxonomies.signalReasons),
    context: z.string(),
  }),
} satisfies Record<string, z.ZodObject>;

/** Properties of an event; a strict empty object infers an index signature, hence the check. */
type EventProperties<S extends z.ZodObject> = keyof S['shape'] extends never
  ? Record<never, never>
  : z.infer<S>;

export type AnalyticsEvents = {
  [E in keyof typeof analyticsEvents]: EventProperties<(typeof analyticsEvents)[E]>;
};

export type AnalyticsEventName = keyof AnalyticsEvents;

/** Arguments of `track` after the event name: its properties, unless it has none. */
export type AnalyticsEventArgs<E extends AnalyticsEventName> =
  keyof AnalyticsEvents[E] extends never ? [] : [properties: AnalyticsEvents[E]];

export function isAnalyticsEventName(name: string): name is AnalyticsEventName {
  return Object.hasOwn(analyticsEvents, name);
}

export type AnalyticsEventCheck =
  { success: true; properties: Record<string, unknown> } | { success: false; error: string };

/**
 * Checks an event against its schema, at run time: an unknown event, an unknown property or a
 * value outside its list is refused, with the reason (names and paths, never the values).
 */
export function checkAnalyticsEvent(name: string, properties: unknown): AnalyticsEventCheck {
  if (!isAnalyticsEventName(name)) {
    return { success: false, error: `Unknown analytics event: ${name}` };
  }
  const result = analyticsEvents[name].safeParse(properties ?? {});
  if (!result.success) {
    const paths = result.error.issues.map((issue) =>
      issue.code === 'unrecognized_keys'
        ? `unknown ${issue.keys.join(', ')}`
        : `${issue.code} at ${issue.path.join('.')}`,
    );
    return { success: false, error: `Invalid ${name}: ${paths.join('; ')}` };
  }
  return { success: true, properties: result.data };
}
