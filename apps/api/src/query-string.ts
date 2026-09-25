/**
 * Query string parser of the API. The wiki writes list filters `moods[]=food`; clients may also
 * repeat the plain key `moods=food`. Both are read as the key without brackets, and a key given
 * several times, in either form, becomes an array. Any other bracket notation (`moods[0]`,
 * `moods[x]`) stays as is, so that a strict schema refuses it instead of ignoring it.
 */
export function parseQueryString(query: string): Record<string, string | string[]> {
  // Null prototype: a `__proto__` key is a plain key, refused by the schemas.
  const parsed: Record<string, string | string[]> = Object.create(null);
  for (const [rawKey, value] of new URLSearchParams(query)) {
    const key = rawKey.endsWith('[]') ? rawKey.slice(0, -2) : rawKey;
    const previous = parsed[key];
    if (previous === undefined) {
      parsed[key] = rawKey === key ? value : [value];
    } else {
      parsed[key] = [...(Array.isArray(previous) ? previous : [previous]), value];
    }
  }
  return parsed;
}
