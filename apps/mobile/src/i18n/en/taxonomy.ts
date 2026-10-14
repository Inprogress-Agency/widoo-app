import type { TaxonomyLabels } from '@widoo/shared';

/** The taxonomies the app shows: filters, cards, route sheets and steps. */
export type AppTaxonomy =
  'audiences' | 'budgets' | 'durations' | 'transports' | 'moods' | 'conditions' | 'placeCategories';

/**
 * English labels of the taxonomies the app shows; the French ones are `labels.fr` of
 * `@widoo/shared`. The compiler rejects a value without a label.
 */
export const taxonomy = {
  audiences: {
    solo: 'Solo',
    couple: 'Couple',
    family: 'Family',
    friends: 'With friends',
    dog_friendly: 'Dog friendly',
    kids_friendly: 'Kids friendly',
  },
  budgets: {
    free: 'Free',
    low: 'Up to €25',
    medium: '€25 to €70',
    high: 'Over €70',
  },
  durations: {
    '1_2h': 'Up to 2 h 30',
    half_day: '2 h 30 to 5 h',
    full_day: '5 to 12 h',
    weekend: 'Over 12 h',
  },
  transports: { walk: 'On foot', bike: 'Bike', metro: 'Metro', car: 'Car' },
  moods: {
    culture: 'Culture',
    nature: 'Nature',
    shopping: 'Shopping',
    food: 'Food',
    romantic: 'Romantic',
    unusual: 'Offbeat',
    instagrammable: 'Instagrammable',
    relax: 'Chill',
    sport: 'Active',
  },
  conditions: {
    no_booking: 'No booking',
    wheelchair: 'Wheelchair access',
    indoor: 'Indoors',
    outdoor: 'Outdoors',
    sunny: 'Sunny day',
    rainy: 'Rainy day',
  },
  placeCategories: {
    restaurant: 'Restaurant',
    cafe: 'Café',
    bar: 'Bar',
    bakery: 'Bakery',
    museum: 'Museum',
    gallery: 'Gallery',
    monument: 'Monument',
    park: 'Park',
    viewpoint: 'Viewpoint',
    shop: 'Shop',
    activity: 'Activity',
    event_venue: 'Show',
    walk: 'Walk',
    other: 'Other',
  },
} as const satisfies Pick<TaxonomyLabels, AppTaxonomy>;
