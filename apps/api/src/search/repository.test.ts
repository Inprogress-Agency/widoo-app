import { describe, expect, it } from 'vitest';
import { toCard, type CardRow } from './repository';

const pin = (name: string, durationMin: number) => ({
  category: 'museum',
  name,
  duration_min: durationMin,
  lat: 48.86,
  lng: 2.35,
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
  steps: [pin('Musée fictif', 45), pin('Galerie fictive', 30)],
});

describe('toCard', () => {
  it('names each step and gives its time on the spot', () => {
    expect(toCard(row('free')).steps).toEqual([
      expect.objectContaining({ category: 'museum', name: 'Musée fictif', durationMin: 45 }),
      expect.objectContaining({ category: 'museum', name: 'Galerie fictive', durationMin: 30 }),
    ]);
  });

  it('names no step of a Premium route (D-014)', () => {
    const card = toCard(row('premium'));
    expect(card.steps).toHaveLength(2);
    for (const step of card.steps) {
      expect(step).toMatchObject({ name: null, durationMin: null });
    }
    expect(JSON.stringify(card)).not.toContain('fictive');
    expect(JSON.stringify(card)).not.toContain('Musée');
  });
});
