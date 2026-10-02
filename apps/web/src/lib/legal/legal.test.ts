import { legalDocOfPath } from '@/config/legal';
import { describe, expect, it, vi } from 'vitest';
import { fetchLegalText } from './fetch';
import { toLegalBlocks, toLegalText } from './from-api';

const apiText = {
  version: '2026-10-01',
  updatedAt: '2026-10-01T09:00:00Z',
  title: 'Politique de confidentialité de Widoo',
  summary: ['Nous gardons votre profil.', 'La mesure d’audience n’a lieu qu’avec votre accord.'],
  sections: [{ title: '7. Âge minimum', body: 'Widoo est réservé aux personnes de 16 ans.' }],
};

describe('toLegalText', () => {
  it('keeps a complete text of the API', () => {
    expect(toLegalText(apiText)).toEqual(apiText);
  });

  it('reads a summary of one sentence, or none', () => {
    expect(toLegalText({ ...apiText, summary: 'Une phrase.' })?.summary).toEqual(['Une phrase.']);
    expect(toLegalText({ ...apiText, summary: undefined })?.summary).toEqual([]);
  });

  it('refuses a text with a missing, empty or invalid part, never shows half of it', () => {
    expect(toLegalText(null)).toBeNull();
    expect(toLegalText({ ...apiText, title: ' ' })).toBeNull();
    expect(toLegalText({ ...apiText, updatedAt: 'hier' })).toBeNull();
    expect(toLegalText({ ...apiText, sections: [] })).toBeNull();
    expect(toLegalText({ ...apiText, sections: [{ title: '1.', body: 3 }] })).toBeNull();
    expect(toLegalText({ ...apiText, summary: 4 })).toBeNull();
  });
});

describe('toLegalBlocks', () => {
  it('splits paragraphs on blank lines and reads the lines starting with « - » as a list', () => {
    expect(
      toLegalBlocks('Premier\nparagraphe.\n\nVous vous engagez à :\n\n- un ;\n- deux.'),
    ).toEqual([
      { kind: 'paragraph', text: 'Premier paragraphe.' },
      { kind: 'paragraph', text: 'Vous vous engagez à :' },
      { kind: 'list', items: ['un ;', 'deux.'] },
    ]);
  });
});

describe('fetchLegalText', () => {
  const answer = (status: number, body: unknown) =>
    vi.fn<typeof fetch>(async () => Response.json(body, { status }));

  it('asks the API for the text in the language of the page, cached an hour', async () => {
    const fetchImpl = answer(200, apiText);
    expect(await fetchLegalText('https://api.example', 'privacy', 'en', fetchImpl)).toEqual(
      apiText,
    );
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(String(url)).toBe('https://api.example/v1/legal/privacy?locale=en');
    expect(init).toMatchObject({ next: { revalidate: 3600, tags: ['legal:privacy'] } });
  });

  it('has no text without one in the API, and fails when the API fails', async () => {
    expect(await fetchLegalText('https://api.example', 'terms', 'fr', answer(404, {}))).toBeNull();
    await expect(
      fetchLegalText('https://api.example', 'terms', 'fr', answer(503, {})),
    ).rejects.toThrow('503');
  });
});

describe('legalDocOfPath', () => {
  it('finds the text of a path in either language, and nothing else', () => {
    expect(legalDocOfPath('/conditions')).toBe('terms');
    expect(legalDocOfPath('/terms/')).toBe('terms');
    expect(legalDocOfPath('/privacy')).toBe('privacy');
    expect(legalDocOfPath('/confidentialite')).toBe('privacy');
    expect(legalDocOfPath('/r/conditions')).toBeNull();
  });
});
