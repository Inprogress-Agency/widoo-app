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

  it.each([
    ['an empty update', {}],
    ['a field that is not editable', { role: 'admin' }],
    ['an e-mail', { email: 'camille.test@example.com' }],
    ['an avatar URL, until avatars are uploaded', { avatarUrl: 'https://example.com/a.jpg' }],
    ['an unknown preference', { notificationPrefs: { marketing: true } }],
  ])('rejects %s', (_, update) => {
    expect(UpdateMe.safeParse(update).success).toBe(false);
  });
});
