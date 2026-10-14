import {
  Anecdote,
  Bio,
  FirstName,
  Neighborhood,
  profileSlots,
  type AnalyticsEvents,
  type FeaturedRoute,
  type Me,
  type UpdateMe,
} from '@widoo/shared';

/** An anecdote of the form: the question with its current label, and the answer. */
export interface DraftAnecdote {
  questionKey: string;
  questionLabel: string;
  answer: string;
}

/** What « Modifier le profil » edits, until « Enregistrer » sends it in one `PATCH /me`. */
export interface ProfileDraft {
  firstName: string;
  bio: string;
  neighborhood: string;
  anecdotes: DraftAnecdote[];
  featured: FeaturedRoute[];
}

/** A field of `profile_updated` (wiki Analytics › Action). */
export type ProfileField = AnalyticsEvents['profile_updated']['fields'][number];

export type DraftError = 'firstName' | 'bio' | 'neighborhood' | 'anecdotes';

export function draftOf(me: Me): ProfileDraft {
  return {
    firstName: me.firstName ?? '',
    bio: me.bio ?? '',
    neighborhood: me.neighborhood ?? '',
    anecdotes: me.anecdotes.map(({ questionKey, questionLabel, answer }) => ({
      questionKey,
      questionLabel,
      answer,
    })),
    featured: me.featuredRoutes.map(({ id, title }) => ({ id, title })),
  };
}

/** An empty text clears its field: the API takes null for « no bio ». */
const textOrNull = (text: string) => (text.trim() === '' ? null : text.trim());

const sameAnecdotes = (a: readonly Anecdote[], b: readonly Anecdote[]) =>
  a.length === b.length &&
  a.every(
    (anecdote, index) =>
      anecdote.questionKey === b[index]?.questionKey && anecdote.answer === b[index]?.answer,
  );

const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id, index) => id === b[index]);

const anecdotesOf = (anecdotes: readonly DraftAnecdote[]): Anecdote[] =>
  anecdotes.map(({ questionKey, answer }) => ({ questionKey, answer: answer.trim() }));

export interface DraftChanges {
  /** The body of `PATCH /me`: the changed fields only; null when nothing changed. */
  update: UpdateMe | null;
  /** What `profile_updated` reports; the first name is not one of its fields. */
  fields: ProfileField[];
}

/** What « Enregistrer » sends, and what « Annuler » asks to abandon. */
export function changesOf(me: Me, draft: ProfileDraft): DraftChanges {
  const update: UpdateMe = {};
  const fields: ProfileField[] = [];

  const firstName = draft.firstName.trim();
  if (firstName !== (me.firstName ?? '')) {
    update.firstName = firstName;
  }
  const bio = textOrNull(draft.bio);
  if (bio !== me.bio) {
    update.bio = bio;
    fields.push('bio');
  }
  const neighborhood = textOrNull(draft.neighborhood);
  if (neighborhood !== me.neighborhood) {
    update.neighborhood = neighborhood;
    fields.push('neighborhood');
  }
  const anecdotes = anecdotesOf(draft.anecdotes);
  if (!sameAnecdotes(anecdotes, me.anecdotes)) {
    update.anecdotes = anecdotes;
    fields.push('anecdotes');
  }
  const featuredIds = draft.featured.map((route) => route.id);
  if (
    !sameIds(
      featuredIds,
      me.featuredRoutes.map((route) => route.id),
    )
  ) {
    update.featuredRouteIds = featuredIds;
    fields.push('featured');
  }
  return { update: Object.keys(update).length > 0 ? update : null, fields };
}

/** The fields the API would refuse, checked with its own schemas before sending. */
export function draftErrors(draft: ProfileDraft): DraftError[] {
  const errors: DraftError[] = [];
  if (!FirstName.safeParse(draft.firstName.trim()).success) {
    errors.push('firstName');
  }
  const bio = textOrNull(draft.bio);
  if (bio !== null && !Bio.safeParse(bio).success) {
    errors.push('bio');
  }
  const neighborhood = textOrNull(draft.neighborhood);
  if (neighborhood !== null && !Neighborhood.safeParse(neighborhood).success) {
    errors.push('neighborhood');
  }
  const isAnecdoteValid = anecdotesOf(draft.anecdotes).every(
    (anecdote) => Anecdote.safeParse(anecdote).success,
  );
  if (!isAnecdoteValid || draft.anecdotes.length > profileSlots) {
    errors.push('anecdotes');
  }
  return errors;
}

/** « Monter » (-1) or « Descendre » (+1): the list with the item moved, or as is at an end. */
export function moveItem<T>(items: readonly T[], index: number, offset: -1 | 1): T[] {
  const target = index + offset;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return [...items];
  }
  const moved = [...items];
  const [item] = moved.splice(index, 1) as [T];
  moved.splice(target, 0, item);
  return moved;
}

/** An anecdote added goes last; one edited keeps its place, even with a new question. */
export function putAnecdote(
  anecdotes: readonly DraftAnecdote[],
  anecdote: DraftAnecdote,
  index: number | null,
): DraftAnecdote[] {
  if (index === null) {
    return [...anecdotes, anecdote].slice(0, profileSlots);
  }
  return anecdotes.map((current, position) => (position === index ? anecdote : current));
}

/** `profile_updated` for the fields saved; null for a first name alone, which it does not report. */
export function profileUpdatedEvent(
  fields: readonly ProfileField[],
): AnalyticsEvents['profile_updated'] | null {
  const [first, ...rest] = fields;
  return first ? { fields: [first, ...rest] } : null;
}
