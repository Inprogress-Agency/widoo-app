import { describe, expect, it } from 'vitest';
import { fill, plural } from './fill';

describe('fill', () => {
  it('replaces each placeholder by its value', () => {
    expect(fill('Par {name}, {count} avis', { name: 'Camille', count: 3 })).toBe(
      'Par Camille, 3 avis',
    );
  });

  it('leaves a placeholder without value visible, to be caught in review', () => {
    expect(fill('Par {name}', {})).toBe('Par {name}');
  });
});

describe('plural', () => {
  const steps = { one: '{count} étape', other: '{count} étapes' };

  it('follows the plural rules of the language', () => {
    expect(plural(1, steps, 'fr')).toBe('1 étape');
    expect(plural(4, steps, 'fr')).toBe('4 étapes');
    expect(plural(0, steps, 'fr')).toBe('0 étape');
    expect(plural(0, { one: '{count} stop', other: '{count} stops' }, 'en')).toBe('0 stops');
  });
});
