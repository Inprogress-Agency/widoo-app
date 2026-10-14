import { describe, expect, it } from 'vitest';
import { LegalDocument, LegalQuery } from '.';

describe('LegalDocument', () => {
  const document = {
    doc: 'privacy',
    version: '2026-09-28',
    updatedAt: '2026-09-28T00:00:00.000Z',
    locale: 'fr',
    title: 'Politique de confidentialité de Widoo',
    summary: ['Nous gardons votre profil.'],
    sections: [{ title: '1. Qui est responsable', body: 'Inprogress Agency.' }],
  };

  it('accepts a text with its version, its language and its articles', () => {
    expect(LegalDocument.parse(document)).toEqual(document);
  });

  it('refuses a text without article or with an unknown document', () => {
    expect(LegalDocument.safeParse({ ...document, sections: [] }).success).toBe(false);
    expect(LegalDocument.safeParse({ ...document, doc: 'cookies' }).success).toBe(false);
  });

  it('asks for French unless the app says otherwise, and refuses another language', () => {
    expect(LegalQuery.parse({})).toEqual({ locale: 'fr' });
    expect(LegalQuery.safeParse({ locale: 'de' }).success).toBe(false);
  });
});
