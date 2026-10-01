// Test data shared by the tests of `lib/shared-route`.

const id = '3f1c2a4e-9b7d-4c1e-8a2b-5d6e7f809a1b';

/** A `RouteDetail` as #36 describes it, trimmed to what the page reads, plus a step it ignores. */
export const apiRoute = {
  id,
  title: 'Montmartre sans les touristes',
  coverUrl: 'https://photos.example/montmartre.jpg',
  isOfficial: false,
  author: { id: '0b8f7e6d-5c4b-4a39-8271-605f4e3d2c1b', firstName: 'Camille', avatarUrl: null },
  access: 'free',
  isVerified: true,
  moods: ['culture', 'romantic'],
  audiences: [],
  district: '18e',
  neighborhood: 'Abbesses',
  durationMin: 420,
  durationBucket: 'full_day',
  budgetPerPersonEur: { min: 38, max: 38 },
  budgetBucket: 'medium',
  distanceM: 6100,
  rating: { average: 4.9, count: 128 },
  status: 'published',
  description: 'Une journée à Montmartre.',
  photoUrls: [],
  steps: [{ name: 'Place des Abbesses' }, {}, {}, {}],
};
