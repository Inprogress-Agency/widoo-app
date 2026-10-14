import { describe, expect, it } from 'vitest';
import { fr } from '../i18n/fr';

/** Every string of an object of strings, nested. */
const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : Object.values(value as object).flatMap(strings);

describe('E-10 copy', () => {
  it('addresses the user as « vous », never « tu » (D-015)', () => {
    for (const text of strings(fr.auth)) {
      expect(text).not.toMatch(/\b(tu|te|toi|ton|ta|tes|t')\b/i);
    }
  });
});
