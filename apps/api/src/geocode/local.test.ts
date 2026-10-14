import { describe, expect, it } from 'vitest';
import { localGeocoder } from './local';

describe('localGeocoder', () => {
  it('names the arrondissements in the language asked', async () => {
    const [french] = await localGeocoder.find('Montmartre', 'fr');
    const [english] = await localGeocoder.find('Montmartre', 'en');
    expect(french?.area).toBe('Paris 18e');
    expect(english?.area).toBe('Paris 18th');
  });
});
