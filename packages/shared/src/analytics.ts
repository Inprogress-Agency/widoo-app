import type {
  Audience,
  BookingProvider,
  BudgetBucket,
  Condition,
  DurationBucket,
  Mood,
  SignalReason,
  Transport,
} from './taxonomies';

/**
 * Product analytics events (wiki Analytics), sent by the app to PostHog once the user consents.
 * Property names are the wire names. A value the wiki does not enumerate stays a `string` until
 * the screen that sends it is specified. Server events (`moderation_decision`, `place_flagged`)
 * join when the API sends events.
 */

/** Sent with every event. PostHog adds `$session_id` itself. */
export interface AnalyticsCommonProperties {
  app_version: string;
  platform: 'ios' | 'android';
  /** City slug of the explored area (`paris`), never a position. */
  city: string;
  is_authenticated: boolean;
}

/** Active filters, as technical keys. */
export interface AnalyticsFilters {
  audiences: Audience[];
  moods: Mood[];
  conditions: Condition[];
  durations: DurationBucket[];
  budgets: BudgetBucket[];
  transports: Transport[];
}

type NoProperties = Record<never, never>;
type RouteProperties = { route_id: string };
type AuthIntent = 'favorite' | 'plan' | 'go' | 'create' | 'signal';
type PurchaseProperties = { plan: 'monthly' | 'annual' };
type CreateSavedProperties = { steps_count: number; warnings_count: number };

export interface AnalyticsEvents {
  // Discovery
  app_opened: { cold_start: boolean };
  map_search_zone: {
    zoom: number;
    results_count: number;
    trigger: 'initial' | 'button' | 'geocode';
  };
  filters_applied: AnalyticsFilters & {
    results_count: number;
    source: 'chip' | 'panel' | 'weather';
  };
  filters_no_results: AnalyticsFilters;
  weather_banner_shown: { condition: string };
  weather_banner_tapped: { condition: string };
  search_text: { kind: 'geo' | 'route'; has_result: boolean };
  result_card_viewed: RouteProperties & { position: number; sheet_level: string };
  route_opened: RouteProperties & {
    source: 'marker' | 'card' | 'link' | 'favorites' | 'planned';
  };
  route_scrolled: RouteProperties & { depth: 'info' | 'timeline' | 'steps' | 'end' };
  route_shared: RouteProperties;
  // Action
  auth_prompted: { intent: AuthIntent };
  auth_completed: {
    provider: 'apple' | 'google' | 'email';
    intent: AuthIntent;
    is_new_user: boolean;
  };
  favorite_added: RouteProperties;
  favorite_removed: RouteProperties;
  route_planned: RouteProperties & {
    days_ahead: number;
    has_conflicts: boolean;
    bookings_count: number;
  };
  plan_checklist_item_done: RouteProperties & { provider: BookingProvider };
  booking_link_opened: RouteProperties & {
    step_id: string;
    provider: BookingProvider;
    context: 'route' | 'plan' | 'go';
  };
  go_started: RouteProperties & { was_planned: boolean };
  maps_opened: RouteProperties & { mode: 'full' | 'next_step' };
  go_step_done: RouteProperties & { step_index: number };
  go_completed: RouteProperties & { duration_actual_min: number; steps_done_ratio: number };
  route_rated: RouteProperties & { rating: number; has_comment: boolean };
  view_switched: { to: 'map' | 'list' };
  creator_profile_opened: { creator_id: string; source: string };
  paywall_shown: { reason: 'plans_limit' | 'favorites_limit' | 'premium_route' };
  paywall_dismissed: PurchaseProperties;
  purchase_started: PurchaseProperties;
  purchase_completed: PurchaseProperties;
  reminder_received: NoProperties;
  reminder_tapped: NoProperties;
  // Creation and quality
  create_started: NoProperties;
  create_step_added: { place_source: 'existing' | 'new' };
  create_coherence_warning: { codes: string[] };
  create_saved_private: CreateSavedProperties;
  create_submitted: CreateSavedProperties;
  place_confirmed: { context: string };
  place_reported: { reason: SignalReason; context: string };
}

export type AnalyticsEventName = keyof AnalyticsEvents;

/** Arguments of `track` after the event name: its properties, unless it has none. */
export type AnalyticsEventArgs<E extends AnalyticsEventName> =
  keyof AnalyticsEvents[E] extends never ? [] : [properties: AnalyticsEvents[E]];
