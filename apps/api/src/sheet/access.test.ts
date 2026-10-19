import type { RouteStatus } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { sheetAccessOf, type SheetRoute } from './access';

// One line per cell of « Qui obtient quoi » (wiki API › Fiche parcours, D-093). Fictitious ids.
const authorId = '0192f0a0-0000-7000-8000-0000000000a1';
const otherId = '0192f0a0-0000-7000-8000-0000000000b2';
const shareToken = 'Fictitious_share-token_0123456789ab';
const publishedAt = new Date('2026-09-01T08:00:00Z');
const route = (status: RouteStatus, values: Partial<SheetRoute> = {}): SheetRoute => ({
  status,
  authorId,
  shareToken,
  publishedAt: null,
  ...values,
});
const anonymous = { userId: null, token: undefined };
const withLink = { userId: null, token: shareToken };
const author = { userId: authorId, token: undefined };
const open = (viaLink: boolean, isAuthor = false) => ({ kind: 'open', viaLink, isAuthor });
const notFound = { kind: 'not_found' };

describe('sheetAccessOf', () => {
  it.each(['published', 'needs_fix'] as const)('opens a %s route to anyone, link ignored', (s) => {
    expect(sheetAccessOf(route(s, { publishedAt }), anonymous)).toEqual(open(false));
    expect(sheetAccessOf(route(s, { publishedAt }), withLink)).toEqual(open(false));
    expect(sheetAccessOf(route(s, { publishedAt }), author)).toEqual(open(false, true));
  });

  it.each(['private', 'pending', 'changes_requested'] as const)(
    'opens a %s route never published by its link and to its author, else 404',
    (status) => {
      expect(sheetAccessOf(route(status), anonymous)).toEqual(notFound);
      expect(sheetAccessOf(route(status), withLink)).toEqual(open(true));
      expect(sheetAccessOf(route(status), author)).toEqual(open(false, true));
    },
  );

  it.each(['pending', 'changes_requested'] as const)(
    'keeps a %s route published once from its link, not from its author (Q3)',
    (status) => {
      expect(sheetAccessOf(route(status, { publishedAt }), withLink)).toEqual(notFound);
      expect(sheetAccessOf(route(status, { publishedAt }), author)).toEqual(open(false, true));
    },
  );

  it.each(['draft', 'rejected'] as const)('answers 404 for a %s route, author included', (s) => {
    for (const caller of [anonymous, withLink, author]) {
      expect(sheetAccessOf(route(s), caller)).toEqual(notFound);
    }
  });

  it('answers 410 for a withdrawn route to anyone, with or without its link', () => {
    for (const caller of [anonymous, withLink, author]) {
      expect(sheetAccessOf(route('unpublished', { publishedAt }), caller)).toEqual({
        kind: 'removed',
      });
    }
  });

  it('answers 404 to a wrong token, a token of another route, or another account', () => {
    const wrong = { userId: null, token: `${shareToken.slice(0, -1)}c` };
    expect(sheetAccessOf(route('private'), wrong)).toEqual(notFound);
    expect(sheetAccessOf(route('private', { shareToken: null }), withLink)).toEqual(notFound);
    expect(sheetAccessOf(route('private'), { userId: otherId, token: undefined })).toEqual(
      notFound,
    );
    expect(sheetAccessOf(route('private'), { userId: null, token: 'short' })).toEqual(notFound);
  });
});
