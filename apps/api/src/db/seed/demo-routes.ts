/**
 * Demo dataset (#32): ten Paris routes on real places, fictitious but credible. Descriptions are
 * written for the demo, photos come from Unsplash (free licence), no real person appears: the
 * two authors are invented and have no email. Nothing the engine computes is entered: trips,
 * `computed`, buckets and transport come from the orchestration (`demo-orchestration.ts`).
 * The JSON is parsed at load, so a typo fails loudly instead of seeding a broken route.
 */
import {
  bookingNoteMaxLength,
  HttpsUrl,
  LatLng,
  PhotoCredit,
  routeTipMaxLength,
  routeTipsMax,
  routeTitleMaxLength,
  stepDescriptionMaxLength,
  StepHighlights,
  stepPhotosMax,
  taxonomies,
  type BudgetBucket,
  type DurationBucket,
  type Transport,
} from '@widoo/shared';
import { z } from 'zod';
import raw from './demo-routes.json';

const Key = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'kebab-case key');
const LocalTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM');
const euros = z.number().nonnegative();

const DemoPlace = z.object({
  key: Key,
  name: z.string().min(1),
  category: z.enum(taxonomies.placeCategories),
  location: LatLng,
  address: z.string().min(1),
  /** Stored in `places.address_components`; the route cards show arrondissement and neighbourhood. */
  addressComponents: z.object({
    postcode: z.string().regex(/^75\d{3}$/),
    arrondissement: z.string().min(1),
    neighborhood: z.string().min(1),
  }),
  isIndoor: z.boolean(),
  priceRange: z.enum(taxonomies.priceRanges),
  /** Empty: hours unknown, or a place open at any hour (`alwaysOpen`). 0 = Monday. */
  hours: z.array(
    z.object({
      weekdays: z.array(z.number().int().min(0).max(6)).min(1),
      opens: LocalTime,
      closes: LocalTime,
    }),
  ),
  /** « Accessible à toute heure » (a street, a square, an open park): no hours (D-049). */
  alwaysOpen: z.boolean().default(false),
});

const DemoPhoto = z.object({
  url: HttpsUrl,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

/**
 * A photo of « En images » (D-029). With a credit, it stands for a free photo of Wikimedia
 * Commons (D-050): the photo stays an Unsplash one, the author and the source page are fictitious.
 */
const DemoStepPhoto = DemoPhoto.extend({ credit: PhotoCredit.optional() });

const DemoStep = z.object({
  place: Key,
  description: z.string().min(1).max(stepDescriptionMaxLength),
  /** Rule `step_has_duration` (wiki Orchestration): 10 min to 6 h. */
  durationMin: z.number().int().min(10).max(360),
  costPerPerson: euros,
  bookingRequired: z.boolean().default(false),
  bookingUrl: HttpsUrl.optional(),
  bookingProvider: z.enum(taxonomies.bookingProviders).optional(),
  bookingNote: z.string().min(1).max(bookingNoteMaxLength).optional(),
  /** On a fictitious link only (example.com): no real affiliate programme in the demo. */
  bookingIsAffiliate: z.boolean().default(false),
  /** Last day of an ephemeral step (D-050). */
  endsOn: z.iso.date().optional(),
  transitionNote: z.string().min(1).optional(),
  /** Mode of the trip to the next step, as the creator chose it; absent: the proposed one (D-048). */
  transitionMode: z.enum(taxonomies.transports).optional(),
  /** « À ne pas manquer » of E-07 (D-029). */
  highlights: StepHighlights.optional(),
  photos: z.array(DemoStepPhoto).max(stepPhotosMax).default([]),
});

const DemoRoute = z.object({
  key: Key,
  title: z.string().min(1).max(routeTitleMaxLength),
  /** Rule `missing_description`: 80 characters at least to publish. */
  description: z.string().min(80),
  /** Key of an author, or null for a route « Par Widoo ». */
  author: Key.nullable(),
  moods: z.array(z.enum(taxonomies.moods)).min(1),
  audiences: z.array(z.enum(taxonomies.audiences)).min(1),
  conditions: z.array(z.enum(taxonomies.conditions)),
  /** « Départ conseillé » of the creator; absent: computed (D-050). */
  suggestedStart: LocalTime.optional(),
  /** « À prévoir », lines of the creator (D-048). */
  tips: z.array(z.string().min(1).max(routeTipMaxLength)).max(routeTipsMax).default([]),
  photos: z.array(DemoPhoto).min(1),
  steps: z.array(DemoStep).min(3).max(6),
});

const DemoAuthor = z.object({
  key: Key,
  firstName: z.string().min(1),
  bio: z.string().max(150),
});

const unique = (keys: string[]) => new Set(keys).size === keys.length;

export const DemoDataset = z
  .object({
    /** Date of every timestamp of the seed rows, so that a second run changes nothing. */
    datasetDate: z.iso.datetime(),
    authors: z.array(DemoAuthor),
    places: z.array(DemoPlace),
    routes: z.array(DemoRoute).length(10),
  })
  .refine(({ authors, places, routes }) =>
    [authors, places, routes].every((items) => unique(items.map((item) => item.key))),
  )
  .refine(
    ({ places, routes }) => {
      const placeKeys = new Set(places.map((place) => place.key));
      return routes.every((route) => route.steps.every((step) => placeKeys.has(step.place)));
    },
    { message: 'Every step names a place of the dataset' },
  )
  .refine(
    ({ authors, routes }) => {
      const authorKeys = new Set(authors.map((author) => author.key));
      return routes.every((route) => route.author === null || authorKeys.has(route.author));
    },
    { message: 'Every author of a route is in the dataset' },
  )
  .refine(({ places }) => places.every((place) => !place.alwaysOpen || place.hours.length === 0), {
    message: 'A place open at any hour has no hours',
  })
  .refine(
    ({ routes }) =>
      routes.every((route) =>
        route.steps.every(
          (step) => !step.bookingIsAffiliate || step.bookingUrl?.startsWith('https://example.com/'),
        ),
      ),
    { message: 'An affiliate link of the demo is a fictitious link' },
  )
  .refine(
    ({ routes }) =>
      routes.every((route) =>
        route.steps.every((step) =>
          step.photos.every(
            ({ credit }) => !credit || credit.sourceUrl.startsWith('https://example.com/'),
          ),
        ),
      ),
    { message: 'The credit of a demo photo is fictitious' },
  );
export type DemoDataset = z.infer<typeof DemoDataset>;
export type DemoRoute = DemoDataset['routes'][number];
export type DemoPlace = DemoDataset['places'][number];

export const demoDataset: DemoDataset = DemoDataset.parse(raw);

export const paris = {
  slug: 'paris',
  name: 'Paris',
  center: { lat: 48.8566, lng: 2.3522 },
  bounds: { west: 2.2241, south: 48.8156, east: 2.4699, north: 48.9022 },
  timezone: 'Europe/Paris',
  isActive: true,
};

/** Budget per person: the sum of the estimated step costs (wiki Orchestration). */
export const budgetOf = (route: DemoRoute): number =>
  route.steps.reduce((sum, step) => sum + step.costPerPerson, 0);

/**
 * Filter values that no demo route carries, on purpose: the ticket asks for free to medium
 * budgets and for up to a full day, and no route of Paris needs a car.
 */
export const assumedZeros: {
  budgets: BudgetBucket[];
  durations: DurationBucket[];
  transports: Transport[];
} = {
  budgets: ['high'],
  durations: ['weekend'],
  transports: ['car'],
};
