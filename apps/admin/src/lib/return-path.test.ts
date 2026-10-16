import { describe, expect, it } from 'vitest';
import { returnSection, safeReturnPath, signInPathFor } from './return-path';

describe('safeReturnPath', () => {
  it.each([
    ['/moderation', '/moderation'],
    ['/moderation/42', '/moderation/42'],
    ['/moderation?statut=pending&ville=paris', '/moderation?statut=pending&ville=paris'],
    ['/', '/'],
  ])('keeps %s', (value, expected) => {
    expect(safeReturnPath(value)).toBe(expected);
  });

  it.each([
    ['nothing', null],
    ['an empty value', ''],
    ['another site', 'https://evil.example/moderation'],
    ['a protocol-relative address', '//evil.example/moderation'],
    ['a backslash', '/\\evil.example'],
    ['a path without leading slash', 'moderation'],
    ['a script', 'javascript:alert(1)'],
    ['the sign-in page', '/connexion'],
    ['an unknown page', '/inconnu'],
  ])('sends %s to the dashboard', (_, value) => {
    expect(safeReturnPath(value)).toBe('/');
  });
});

describe('signInPathFor', () => {
  it('remembers the page asked for', () => {
    expect(signInPathFor('/moderation?statut=pending')).toBe(
      '/connexion?retour=%2Fmoderation%3Fstatut%3Dpending',
    );
  });

  it('adds nothing for the dashboard or an unsafe address', () => {
    expect(signInPathFor('/')).toBe('/connexion');
    expect(signInPathFor('//evil.example')).toBe('/connexion');
  });
});

describe('returnSection', () => {
  it('names the section of the page asked for', () => {
    expect(returnSection('/moderation/42')).toBe('moderation');
  });

  it('names nothing for the dashboard', () => {
    expect(returnSection('/')).toBeNull();
  });
});
