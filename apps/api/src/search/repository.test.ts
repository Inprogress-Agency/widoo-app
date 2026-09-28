import { describe, expect, it } from 'vitest';
import { toCard, type CardRow } from './repository';

const pin = (name: string, durationMin: number, category: string, lat: number, lng: number) => ({
  category,
  name,
  duration_min: durationMin,
  lat,
  lng,
  verified: true,
  district: '3e',
  neighborhood: 'Le Marais',
});

const row = (access: CardRow['access']): CardRow => ({
  id: '0192f0a0-0000-7000-8000-000000000001',
  title: 'Parcours fictif',
  is_official: true,
  access,
  moods: ['culture'],
  audiences: ['solo'],
  duration_bucket: '1_2h',
  budget_bucket: 'free',
  computed: { duration_min: 90, budget_per_person_eur: { min: 0, max: 0 }, distance_m: 1200 },
  stats: {},
  author_id: null,
  author_first_name: null,
  author_avatar_url: null,
  cover: null,
  steps: [
    pin('Musée fictif', 45, 'museum', 48.861, 2.351),
    pin('Galerie fictive', 30, 'gallery', 48.872, 2.362),
    pin('Parc fictif', 20, 'park', 48.883, 2.373),
  ],
});

describe('toCard', () => {
  it('carries every step of a free route, named, with its time on the spot', () => {
    const card = toCard(row('free'));
    expect(card.stepCount).toBe(3);
    expect(card.steps).toEqual([
      {
        category: 'museum',
        location: { lat: 48.861, lng: 2.351 },
        name: 'Musée fictif',
        durationMin: 45,
      },
      {
        category: 'gallery',
        location: { lat: 48.872, lng: 2.362 },
        name: 'Galerie fictive',
        durationMin: 30,
      },
      {
        category: 'park',
        location: { lat: 48.883, lng: 2.373 },
        name: 'Parc fictif',
        durationMin: 20,
      },
    ]);
  });

  it('keeps the start alone of a Premium route, unnamed, and counts every step (D-014)', () => {
    const card = toCard(row('premium'));
    expect(card.stepCount).toBe(3);
    expect(card.steps).toEqual([
      { category: 'museum', location: { lat: 48.861, lng: 2.351 }, name: null, durationMin: null },
    ]);
    const body = JSON.stringify(card);
    for (const hidden of [
      'fictive',
      'Musée',
      'Parc fictif',
      '48.872',
      '2.362',
      '48.883',
      '2.373',
    ]) {
      expect(body).not.toContain(hidden);
    }
    expect(body).not.toMatch(/gallery|park/);
  });
});
