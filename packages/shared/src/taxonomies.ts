/**
 * Technical keys of every taxonomy (wiki Filtres-et-Recherche and Modele-de-Donnees).
 * They are the only values persisted or sent over the wire: display labels live in `labels`.
 */
export const taxonomies = {
  audiences: ['solo', 'couple', 'family', 'friends', 'dog_friendly', 'kids_friendly'],
  budgets: ['free', 'low', 'medium', 'premium'],
  durations: ['1_2h', 'half_day', 'full_day', 'weekend'],
  transports: ['walk', 'bike', 'metro', 'car'],
  moods: [
    'culture',
    'nature',
    'shopping',
    'food',
    'romantic',
    'unusual',
    'instagrammable',
    'relax',
    'sport',
  ],
  conditions: ['no_booking', 'wheelchair', 'indoor', 'outdoor', 'sunny', 'rainy'],
  placeCategories: [
    'restaurant',
    'cafe',
    'bar',
    'bakery',
    'museum',
    'gallery',
    'monument',
    'park',
    'viewpoint',
    'shop',
    'activity',
    'event_venue',
    'walk',
    'other',
  ],
  routeStatuses: [
    'draft',
    'private',
    'pending',
    'changes_requested',
    'published',
    'needs_fix',
    'rejected',
    'unpublished',
  ],
  /** Indicative price level of a place (`places.price_range`), unlike a route's computed budget. */
  priceRanges: ['free', 'low', 'medium', 'high'],
  verificationStatuses: ['verified', 'stale', 'flagged', 'closed'],
  signalReasons: [
    'closed_permanently',
    'closed_temporarily',
    'wrong_hours',
    'wrong_address',
    'other',
  ],
  userRoles: ['user', 'editor', 'moderator', 'admin'],
  plans: ['free', 'premium'],
  bookingProviders: ['restaurant', 'ticketing', 'activity', 'other'],
} as const;

export type Taxonomy = keyof typeof taxonomies;
export type TaxonomyValue<T extends Taxonomy> = (typeof taxonomies)[T][number];

export type Audience = TaxonomyValue<'audiences'>;
export type BudgetBucket = TaxonomyValue<'budgets'>;
export type DurationBucket = TaxonomyValue<'durations'>;
export type Transport = TaxonomyValue<'transports'>;
export type Mood = TaxonomyValue<'moods'>;
export type Condition = TaxonomyValue<'conditions'>;
export type PlaceCategory = TaxonomyValue<'placeCategories'>;
export type PriceRange = TaxonomyValue<'priceRanges'>;
export type RouteStatus = TaxonomyValue<'routeStatuses'>;
export type VerificationStatus = TaxonomyValue<'verificationStatuses'>;
export type SignalReason = TaxonomyValue<'signalReasons'>;
export type UserRole = TaxonomyValue<'userRoles'>;
export type Plan = TaxonomyValue<'plans'>;
export type BookingProvider = TaxonomyValue<'bookingProviders'>;
