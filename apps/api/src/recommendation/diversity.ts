/** A route of the ranking, as far as diversity is concerned. */
export type DiversityKey = { mainMood: string | null; neighborhood: string | null };

/** Same main mood and same neighbourhood; an unknown value never clashes. */
const clash = (a: DiversityKey, b: DiversityKey) =>
  a.mainMood !== null &&
  a.neighborhood !== null &&
  a.mainMood === b.mainMood &&
  a.neighborhood === b.neighborhood;

/** A route is pushed back three positions at most (wiki Filtres-et-Recherche). */
export const maxShift = 3;

/**
 * Diversity pass over a ranking: two consecutive routes do not share both their main mood and
 * their neighbourhood. The second is pushed back behind the next route that differs, found
 * within `maxShift` positions, unless a route would then sit more than `maxShift` positions
 * below its rank: it then stays, and the clash with it.
 */
export function diversify<T extends DiversityKey>(ranked: readonly T[]): T[] {
  const queue = ranked.map((item, rank) => ({ item, rank }));
  const result: T[] = [];
  while (queue.length > 0) {
    const last = result.at(-1);
    const head = queue[0];
    let pick = 0;
    // Taking another route first delays the head, which has the best rank, by one position.
    if (last && head && clash(head.item, last) && result.length + 1 - head.rank <= maxShift) {
      const other = queue
        .slice(1, maxShift + 1)
        .findIndex((candidate) => !clash(candidate.item, last));
      if (other >= 0) pick = other + 1;
    }
    const [chosen] = queue.splice(pick, 1);
    if (chosen) result.push(chosen.item);
  }
  return result;
}
