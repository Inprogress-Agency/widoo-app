import { legalDocs, LegalDocument } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { legalDocumentOf, legalVersions, parseLegalText } from './documents';

describe('parseLegalText', () => {
  it('reads the title, the summary and the numbered articles, without the date line', () => {
    const text = parseLegalText(
      [
        '## Politique de Widoo',
        '',
        'Mise à jour le [date de publication].',
        '',
        "### L'essentiel",
        '',
        '- Une phrase.',
        '- Une autre.',
        '',
        '### 1. Qui',
        '',
        'Inprogress Agency.',
        '',
        '- un point ;',
        '- un autre.',
      ].join('\n'),
    );
    expect(text).toEqual({
      title: 'Politique de Widoo',
      summary: ['Une phrase.', 'Une autre.'],
      sections: [{ title: '1. Qui', body: 'Inprogress Agency.\n\n- un point ;\n- un autre.' }],
    });
  });

  it.each([
    ['no title', '### 1. Qui\n\nTexte.'],
    ['text before the articles', '## Titre\n\nUn paragraphe perdu.\n\n### 1. Qui\n\nTexte.'],
    ['an empty article', '## Titre\n\n### 1. Qui\n\n### 2. Quoi\n\nTexte.'],
    ['no article', '## Titre\n\nMise à jour le 28 septembre 2026.'],
  ])('refuses %s', (_case, markdown) => {
    expect(() => parseLegalText(markdown)).toThrow();
  });
});

describe('legalDocumentOf', () => {
  it.each(legalDocs)('serves the French draft of the wiki for %s', (doc) => {
    const document = LegalDocument.parse(legalDocumentOf(doc, 'fr'));
    expect(document).toMatchObject({ doc, locale: 'fr', version: legalVersions[doc] });
    expect(document.sections[0]?.title).toMatch(/^1\. /);
    // Wiki links do not leave the wiki.
    expect(JSON.stringify(document)).not.toMatch(/\]\(/);
    // The site's domain, never one that is not Inprogress's (D-107, D-109).
    expect(JSON.stringify(document)).not.toMatch(/widoo\.app/);
    expect(JSON.stringify(document)).toMatch(/contact@widooapp\.com/);
  });

  it('serves the French text, saying so, while the English one is not written', () => {
    expect(legalDocumentOf('terms', 'en')).toEqual(legalDocumentOf('terms', 'fr'));
  });

  it('puts « L’essentiel » of the privacy policy apart, in three sentences', () => {
    expect(legalDocumentOf('privacy', 'fr').summary).toHaveLength(3);
    expect(legalDocumentOf('terms', 'fr').summary).toBeUndefined();
  });
});
