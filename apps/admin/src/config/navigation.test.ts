import { adminSections } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { navigationFor, sectionOfPath, sectionPaths } from './navigation';

const sectionsOf = (role: Parameters<typeof navigationFor>[0]) =>
  navigationFor(role).map((group) => [group.id, group.sections]);

// The three menus of the board « Coque » (wiki Ecrans › Admin web).
describe('navigationFor', () => {
  it('gives an editor the catalog and the revenue', () => {
    expect(sectionsOf('editor')).toEqual([
      ['catalog', ['catalog', 'aiDrafts', 'translations']],
      ['revenue', ['affiliation', 'b2bClients']],
    ]);
  });

  it('gives a moderator what is to handle, the catalog and the community', () => {
    expect(sectionsOf('moderator')).toEqual([
      ['toHandle', ['moderation', 'reports', 'support']],
      ['catalog', ['catalog', 'translations']],
      ['community', ['users']],
    ]);
  });

  it('gives an admin every section but the dashboard, shown apart', () => {
    const sections = navigationFor('admin').flatMap((group) => group.sections);
    expect([...sections].sort()).toEqual(
      adminSections.filter((section) => section !== 'dashboard').sort(),
    );
  });

  it('gives a user nothing', () => {
    expect(navigationFor('user')).toEqual([]);
  });
});

describe('sectionPaths', () => {
  it('gives each section its own address', () => {
    const paths = Object.values(sectionPaths);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe('sectionOfPath', () => {
  it.each([
    ['/', 'dashboard'],
    ['/moderation', 'moderation'],
    ['/moderation/42', 'moderation'],
    ['/brouillons-ia', 'aiDrafts'],
  ])('finds the section of %s', (pathname, section) => {
    expect(sectionOfPath(pathname)).toBe(section);
  });

  it.each(['/inconnu', '/moderations', '/connexion'])('finds none for %s', (pathname) => {
    expect(sectionOfPath(pathname)).toBeNull();
  });
});
