import type { fr } from './fr';

type Strings<T> = { [K in keyof T]: T[K] extends string ? string : Strings<T[K]> };

/**
 * The shape of every language of the app: the keys of the French strings, a string for each. A
 * translation without a key, or with a key French does not have, fails the typecheck.
 */
export type Translation = Strings<typeof fr>;
