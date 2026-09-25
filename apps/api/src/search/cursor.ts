import type { RouteSort } from '@widoo/shared';
import { z } from 'zod';
import { httpError } from '../errors';

/**
 * Types of the sort key columns, as Postgres compares them. A cursor value is checked against
 * its type before it reaches SQL, so that a forged cursor answers 400 and never a failed cast.
 */
export const sortKeyTypes = {
  int: z.number().int().min(-2_147_483_648).max(2_147_483_647),
  /** Microseconds since the epoch: a string, since postgres.js reads `bigint` as text. */
  bigint: z.string().regex(/^-?\d{1,18}$/),
  float8: z.number().refine(Number.isFinite),
  uuid: z.uuid(),
} as const;
export type SortKeyType = keyof typeof sortKeyTypes;
export type SortKeyValue = number | string;

const Payload = z.strictObject({
  sort: z.string(),
  keys: z.array(z.union([z.number(), z.string()])),
});

/**
 * Opaque cursor of a search page: the sort it belongs to and the sort key values of the last
 * route of the page, in base64url JSON. Not signed: it carries no right, only a position.
 */
export function encodeCursor(sort: RouteSort, keys: readonly SortKeyValue[]): string {
  return Buffer.from(JSON.stringify({ sort, keys })).toString('base64url');
}

/** Sort key values of a cursor, checked against the sort and the key types: 400 otherwise. */
export function decodeCursor(
  cursor: string,
  sort: RouteSort,
  types: readonly SortKeyType[],
): SortKeyValue[] {
  const invalid = () => httpError(400, 'Invalid cursor');
  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw invalid();
  }
  const payload = Payload.safeParse(json);
  if (!payload.success || payload.data.sort !== sort) throw invalid();
  const { keys } = payload.data;
  if (keys.length !== types.length) throw invalid();
  if (!types.every((type, index) => sortKeyTypes[type].safeParse(keys[index]).success)) {
    throw invalid();
  }
  return keys;
}
