import { describe, expect, it } from 'vitest';
import { FirstName, UpdateMe } from '.';

describe('FirstName', () => {
  it.each([
    ['Camille', 'Camille'],
    ['  Anne-Sophie ', 'Anne-Sophie'],
    ['Zoé', 'Zoé'],
  ])('accepts %j as %j', (input, expected) => {
    expect(FirstName.parse(input)).toBe(expected);
  });

  it.each(['', '   ', '<b>Bold</b>', 'Tab\there', 'x'.repeat(51)])('rejects %j', (input) => {
    expect(FirstName.safeParse(input).success).toBe(false);
  });
});

describe('UpdateMe', () => {
  it('accepts a partial update and removing the avatar', () => {
    const update = {
      firstName: ' Camille ',
      avatarUrl: null,
      notificationPrefs: { creatorEmail: false },
    };
    expect(UpdateMe.parse(update)).toEqual({ ...update, firstName: 'Camille' });
  });

  it('accepts the profile: bio, neighborhood, anecdotes and featured routes, or their removal', () => {
    const profile = {
      bio: ' Flâneuse du dimanche. ',
      neighborhood: 'Paris 11e',
      anecdotes: [{ questionKey: 'hidden_gem', answer: 'Un passage couvert.' }],
      featuredRouteIds: ['01997a4e-8c00-7000-8000-000000000101'],
    };
    expect(UpdateMe.parse(profile)).toEqual({ ...profile, bio: 'Flâneuse du dimanche.' });
    const cleared = { bio: null, neighborhood: null, anecdotes: [], featuredRouteIds: [] };
    expect(UpdateMe.parse(cleared)).toEqual(cleared);
  });

  it.each([
    ['an empty update', {}],
    ['a field that is not editable', { role: 'admin' }],
    ['an e-mail', { email: 'camille.test@example.com' }],
    ['an avatar URL, until avatars are uploaded', { avatarUrl: 'https://example.com/a.jpg' }],
    ['an unknown preference', { notificationPrefs: { marketing: true } }],
    ['a bio over 150 characters', { bio: 'a'.repeat(151) }],
    ['an empty neighborhood', { neighborhood: ' ' }],
    ['an anecdote with markup', { anecdotes: [{ questionKey: 'hidden_gem', answer: '<b>' }] }],
    [
      'an anecdote with its label',
      { anecdotes: [{ questionKey: 'hidden_gem', answer: 'Ici.', questionLabel: 'x' }] },
    ],
    ['a route id that is not a uuid', { featuredRouteIds: ['marais-gourmand'] }],
  ])('rejects %s', (_, update) => {
    expect(UpdateMe.safeParse(update).success).toBe(false);
  });
});
