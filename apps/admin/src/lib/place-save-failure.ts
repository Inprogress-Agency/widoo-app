import { ApiRequestError } from '@widoo/api-client';
import type { PlaceFormError } from './place-form';

/** Why a place was not saved, as the form tells it. */
export type PlaceSaveFailure = PlaceFormError | 'outside' | 'refused' | 'failed';

// Message of the 400 the API sends for a position outside every city (place-writes.ts).
const outsideEveryCity = 'Position outside every city';

/**
 * A 400 is a position outside every city or a rule of the place; a 422 is a field the schema
 * refuses (a link that is not https, a phone): the form tells both as a refused field.
 */
export function failureOf(error: unknown): PlaceSaveFailure {
  if (!(error instanceof ApiRequestError) || (error.status !== 400 && error.status !== 422)) {
    return 'failed';
  }
  return error.body?.message === outsideEveryCity ? 'outside' : 'refused';
}
