import { describe, expect, it } from 'vitest';
import { fr } from '../i18n/fr';

/** Every string of an object of strings, nested. */
const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : Object.values(value as object).flatMap(strings);

describe('E-09 copy', () => {
  const texts = [fr.profile, fr.editProfile, fr.anecdote, fr.settings, fr.deleteAccount].flatMap(
    strings,
  );

  it('addresses the user as « vous », never « tu » (D-015)', () => {
    for (const text of texts) {
      expect(text).not.toMatch(/\b(tu|te|toi|ton|ta|tes|t')\b/i);
    }
  });

  it('never shows the e-mail outside the settings (Ecrans › E-09)', () => {
    for (const text of [fr.profile, fr.editProfile].flatMap(strings)) {
      expect(text).not.toMatch(/e-mail/i);
    }
  });
});
