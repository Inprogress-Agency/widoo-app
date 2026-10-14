import { describe, expect, it } from 'vitest';
import { testMe } from '../test/me';
import {
  changesOf,
  draftErrors,
  draftOf,
  moveItem,
  profileUpdatedEvent,
  putAnecdote,
} from './draft';

describe('profile draft', () => {
  const me = testMe();

  it('changes nothing when nothing was touched', () => {
    expect(changesOf(me, draftOf(me))).toEqual({ update: null, fields: [] });
  });

  it('sends only the changed fields, and names them for profile_updated', () => {
    const draft = { ...draftOf(me), bio: '  Nouvelle bio.  ', neighborhood: '' };
    expect(changesOf(me, draft)).toEqual({
      update: { bio: 'Nouvelle bio.', neighborhood: null },
      fields: ['bio', 'neighborhood'],
    });
  });

  it('sends the whole ordered lists when an anecdote or a featured route moves', () => {
    const draft = draftOf(me);
    const moved = {
      ...draft,
      anecdotes: moveItem(draft.anecdotes, 1, -1),
      featured: draft.featured.slice(1),
    };
    const { update, fields } = changesOf(me, moved);
    expect(fields).toEqual(['anecdotes', 'featured']);
    expect(update?.anecdotes?.map((anecdote) => anecdote.questionKey)).toEqual([
      'ideal_sunday',
      'stroll_neighborhood',
    ]);
    expect(update?.featuredRouteIds).toEqual([me.featuredRoutes[1]?.id]);
  });

  it('sends the first name without reporting it, profile_updated has no such field', () => {
    expect(changesOf(me, { ...draftOf(me), firstName: 'Cam' })).toEqual({
      update: { firstName: 'Cam' },
      fields: [],
    });
  });

  it('reports profile_updated only with a field of the catalogue', () => {
    expect(profileUpdatedEvent(['bio', 'featured'])).toEqual({ fields: ['bio', 'featured'] });
    expect(profileUpdatedEvent([])).toBeNull();
  });

  it('checks the fields with the schemas of the API', () => {
    const draft = draftOf(me);
    expect(draftErrors(draft)).toEqual([]);
    expect(draftErrors({ ...draft, firstName: '  ', bio: 'b'.repeat(151) })).toEqual([
      'firstName',
      'bio',
    ]);
  });
});

describe('reordering', () => {
  it('moves up and down, and stays in place at an end', () => {
    expect(moveItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
  });

  it('adds an anecdote last, three at most, and edits one in place', () => {
    const one = { questionKey: 'hidden_gem', questionLabel: 'Un bon plan', answer: 'Ici.' };
    const two = { questionKey: 'work_cafe', questionLabel: 'Mon café', answer: 'Là.' };
    expect(putAnecdote([one], two, null)).toEqual([one, two]);
    expect(putAnecdote([one, one, one], two, null)).toHaveLength(3);
    expect(putAnecdote([one, two], { ...one, answer: 'Ailleurs.' }, 0)[0]?.answer).toBe(
      'Ailleurs.',
    );
  });
});
