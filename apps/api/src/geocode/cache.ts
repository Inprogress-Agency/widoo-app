/**
 * Answers kept in memory for `ttlMs`, per instance, at most `maxEntries`: the oldest entry goes
 * first. Nothing personal is kept: the key is the text of a search, without caller.
 */
export function createTtlCache<T>({
  ttlMs,
  maxEntries,
  now = Date.now,
}: {
  ttlMs: number;
  maxEntries: number;
  now?: () => number;
}) {
  const entries = new Map<string, { value: T; expiresAt: number }>();
  return {
    get(key: string): T | undefined {
      const entry = entries.get(key);
      if (!entry) {
        return undefined;
      }
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key: string, value: T): void {
      entries.delete(key);
      entries.set(key, { value, expiresAt: now() + ttlMs });
      // A Map keeps the order of insertion: its first key is the oldest.
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) {
          break;
        }
        entries.delete(oldest);
      }
    },
    get size() {
      return entries.size;
    },
  };
}

export type TtlCache<T> = ReturnType<typeof createTtlCache<T>>;
