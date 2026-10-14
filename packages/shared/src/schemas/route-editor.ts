/**
 * Bodies and answers of the route editor (wiki API › Création, E-11 to E-14): what the author
 * writes, and the orchestration result the API answers with (D-048, D-049, D-050).
 */
import { z } from 'zod';
import { authorStatusTargets, routeRevisionStatuses } from '../route-lifecycle';
import { taxonomies, type Condition } from '../taxonomies';
import { HttpsUrl, LatLng, plainText } from './common';
import { StepHighlights, StepTransition } from './route';
import { routeEfforts } from './route-detail';

/** Title of a route, 60 characters at most (D-050). */
export const routeTitleMaxLength = 60;
/** The description has no maximum in the wiki: this bound only keeps abuse out. */
export const routeDescriptionMaxLength = 2000;
/** « Le mot de {prénom} » of a step, 600 characters at most (D-049). */
export const stepDescriptionMaxLength = 600;
/** Title of a step, as long as a route title. */
export const stepTitleMaxLength = 60;
/** « Précision » of a booking, 80 characters at most (D-049). */
export const bookingNoteMaxLength = 80;
/** « Vos conseils » of « À prévoir »: three lines of the creator at most (D-048, D-050). */
export const routeTipsMax = 3;
/** One line of « À prévoir »: the wiki sets no length, this bound keeps a line a line. */
export const routeTipMaxLength = 80;
/**
 * Keys of the computed « À prévoir » suggestions the creator switched off (D-050). The keys come
 * from the orchestration (#35): stored as snake_case keys, this bound only keeps abuse out.
 */
export const routeTipsHiddenMax = 20;
/** « Le chemin » of a trip, 200 characters at most (E-12). */
export const transitionNoteMaxLength = 200;
/**
 * Steps a route stores at most. Above `max_steps` (10) the submission is blocked, not the save
 * (Orchestration › Règles de cohérence): this bound only keeps abuse out.
 */
export const storedStepsMax = 30;

/** Conditions the creator ticks; `no_booking` is derived from the steps (D-050). */
export const enteredConditions = [
  'wheelchair',
  'indoor',
  'outdoor',
  'sunny',
  'rainy',
] as const satisfies readonly Condition[];

/** `HH:MM`, a local time of the city, like the opening hours. */
export const LocalTime = z.iso.time({ precision: -1 });

/** A snake_case technical key. */
const TechnicalKey = z.string().regex(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/, 'snake_case key');

/** A list of taxonomy keys, each once, in the order given (the first mood is the main one). */
const uniqueKeys = <T extends readonly [string, ...string[]]>(keys: T) =>
  z
    .array(z.enum(keys))
    .max(keys.length)
    .refine((list) => new Set(list).size === list.length, 'Each value once');

/** `POST /routes`: a draft, untitled until the author names it (« Nouveau parcours » in E-08). */
export const CreateRoute = z.strictObject({
  title: plainText(routeTitleMaxLength).optional(),
});
export type CreateRoute = z.infer<typeof CreateRoute>;

/** `PATCH /routes/:id`: the information of the route (E-11), each field optional. */
export const UpdateRoute = z
  .strictObject({
    title: plainText(routeTitleMaxLength),
    description: plainText(routeDescriptionMaxLength).nullable(),
    moods: uniqueKeys(taxonomies.moods),
    audiences: uniqueKeys(taxonomies.audiences),
    conditions: uniqueKeys(enteredConditions),
    /** « Départ conseillé » chosen by the creator; null: computed (D-048, D-050). */
    suggestedStart: LocalTime.nullable(),
    /** « Vos conseils » of « À prévoir », in order (D-048, D-050). */
    tips: z.array(plainText(routeTipMaxLength)).max(routeTipsMax),
    /** Computed suggestions switched off, each once (D-050). */
    tipsHidden: z
      .array(TechnicalKey)
      .max(routeTipsHiddenMax)
      .refine((keys) => new Set(keys).size === keys.length, 'Each key once'),
  })
  .partial();
export type UpdateRoute = z.infer<typeof UpdateRoute>;

/** One step as the author writes it (E-12). */
export const StepInput = z.strictObject({
  /** An existing step of the route, kept with its photos; absent for a new step. */
  id: z.uuid().optional(),
  placeId: z.uuid(),
  title: plainText(stepTitleMaxLength).nullable().default(null),
  description: plainText(stepDescriptionMaxLength).nullable().default(null),
  highlights: StepHighlights.nullable().default(null),
  /** Checked against 10 min to 6 h at the submission (`step_has_duration`), not at the save. */
  durationMin: z.int().min(1).max(1440),
  costPerPersonEur: z.number().nonnegative().max(10_000).nullable().default(null),
  bookingRequired: z.boolean().default(false),
  bookingUrl: HttpsUrl.nullable().default(null),
  bookingProvider: z.enum(taxonomies.bookingProviders).nullable().default(null),
  /** « Précision », shown with the booking reminder (D-049). */
  bookingNote: plainText(bookingNoteMaxLength).nullable().default(null),
  /** « C'est un lien affilié »: the visitors see « Lien affilié » (D-048, D-050); needs the link. */
  bookingIsAffiliate: z.boolean().default(false),
  /** « Étape éphémère »: its last day, `YYYY-MM-DD` (D-050). */
  endsOn: z.iso.date().nullable().default(null),
  transitionNote: plainText(transitionNoteMaxLength).nullable().default(null),
  /** Mode of the trip to the next step; null: the proposed one (D-048). */
  transitionMode: z.enum(taxonomies.transports).nullable().default(null),
});
export type StepInput = z.infer<typeof StepInput>;

/** `PUT /routes/:id/steps`: the whole ordered list, replacing the previous one. */
export const PutRouteSteps = z.strictObject({
  steps: z
    .array(StepInput)
    .max(storedStepsMax)
    .refine((steps) => {
      const ids = steps.flatMap((step) => (step.id ? [step.id] : []));
      return new Set(ids).size === ids.length;
    }, 'Each step id once')
    .refine(
      (steps) => steps.every((step) => !step.bookingIsAffiliate || step.bookingUrl !== null),
      'An affiliate link needs its booking link',
    ),
});
export type PutRouteSteps = z.infer<typeof PutRouteSteps>;

/** `POST /routes/:id/status`: `private`, `draft` or `unpublished`, by the author. */
export const ChangeRouteStatus = z.strictObject({ status: z.enum(authorStatusTargets) });
export type ChangeRouteStatus = z.infer<typeof ChangeRouteStatus>;

/** Codes of the coherence rules (Orchestration › Règles de cohérence). */
export const coherenceRuleCodes = [
  'missing_title',
  'min_steps',
  'max_steps',
  'step_has_place',
  'step_has_duration',
  'transition_too_long',
  'total_too_long',
  'too_many_transitions',
  'duplicate_place',
  'closed_at_arrival',
  'unverified_place',
  'missing_photo',
  'missing_step_photo',
  'missing_description',
  'back_and_forth',
] as const;
export type CoherenceRuleCode = (typeof coherenceRuleCodes)[number];

/** One rule a route breaks; `stepPosition` is the step concerned, null for the whole route. */
export const CoherenceIssue = z.object({
  code: z.enum(coherenceRuleCodes),
  stepPosition: z.int().nonnegative().nullable(),
});
export type CoherenceIssue = z.infer<typeof CoherenceIssue>;

/** Aggregates of the orchestration, on the estimated trips (D-088); null without any step. */
export const RouteComputed = z.object({
  durationMin: z.int().nonnegative(),
  /** Exact sum of the step costs per person: the app rounds it for display (D-032). */
  budgetPerPersonEur: z.number().nonnegative(),
  distanceM: z.number().nonnegative(),
  walkingM: z.number().nonnegative(),
  effort: z.enum(routeEfforts),
  computedAt: z.iso.datetime(),
});
export type RouteComputed = z.infer<typeof RouteComputed>;

/**
 * The orchestration result of `PUT /routes/:id/steps`: `errors` block the submission (422
 * `coherence_blocked`, the same list in `details.errors`), never the save; `warnings` do not.
 */
export const RouteEvaluation = z.object({
  computed: RouteComputed.nullable(),
  warnings: z.array(CoherenceIssue),
  errors: z.array(CoherenceIssue),
});
export type RouteEvaluation = z.infer<typeof RouteEvaluation>;

/** A step of the editor, as stored: the input, its id and place, and its estimated trip. */
export const EditorStep = StepInput.omit({ id: true, transitionMode: true }).extend({
  id: z.uuid(),
  position: z.int().nonnegative(),
  place: z.object({
    id: z.uuid(),
    name: z.string(),
    category: z.enum(taxonomies.placeCategories),
    location: LatLng,
    address: z.string(),
  }),
  /** The trip to the next step, in the mode chosen or proposed; null for the last one. */
  transition: StepTransition.nullable(),
});
export type EditorStep = z.infer<typeof EditorStep>;

const routeStatus = z.enum(taxonomies.routeStatuses);

/**
 * A route of the caller in the editor. For a published route under revision, the content
 * (information and steps) is the revision's: the published version stays online meanwhile.
 */
export const OwnRoute = z.object({
  id: z.uuid(),
  status: routeStatus,
  isOfficial: z.boolean(),
  access: z.enum(taxonomies.plans),
  /** Null until the author names it: the app shows « Nouveau parcours ». */
  title: z.string().nullable(),
  description: z.string().nullable(),
  moods: z.array(z.enum(taxonomies.moods)),
  audiences: z.array(z.enum(taxonomies.audiences)),
  conditions: z.array(z.enum(taxonomies.conditions)),
  suggestedStart: LocalTime.nullable(),
  tips: z.array(z.string()),
  tipsHidden: z.array(z.string()),
  /** Token of the private link, from the first move to `private` (`GET /routes/:id?token=`). */
  shareToken: z.string().nullable(),
  publishedAt: z.iso.datetime().nullable(),
  updatedAt: z.iso.datetime(),
  /** The open revision of a published route; null otherwise. */
  revision: z.object({ status: z.enum(routeRevisionStatuses) }).nullable(),
  steps: z.array(EditorStep),
  ...RouteEvaluation.shape,
});
export type OwnRoute = z.infer<typeof OwnRoute>;

/** A line of Parcours › Créés (E-08). */
export const OwnRouteSummary = OwnRoute.pick({
  id: true,
  status: true,
  isOfficial: true,
  title: true,
  shareToken: true,
  publishedAt: true,
  updatedAt: true,
  revision: true,
}).extend({ stepCount: z.int().nonnegative() });
export type OwnRouteSummary = z.infer<typeof OwnRouteSummary>;

/** `GET /me/routes`: every status, the newest first. */
export const MyRoutesQuery = z.strictObject({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type MyRoutesQuery = z.infer<typeof MyRoutesQuery>;

export const MyRouteList = z.object({
  items: z.array(OwnRouteSummary),
  nextCursor: z.uuid().nullable(),
});
export type MyRouteList = z.infer<typeof MyRouteList>;
