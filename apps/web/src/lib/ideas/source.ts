import 'server-only';
import { site } from '@/config/site';
import type { IdeaRoutes } from './types';

/**
 * Examples of the mockup (E-21): shown in development only, to review the design of the section.
 * Never online: the routes and their ratings come from the API (#239), never invented.
 */
const mockupRoutes: IdeaRoutes = {
  romantic: {
    id: 'demo-public',
    title: 'Canal Saint-Martin au fil de l’eau',
    durationMin: 180,
    budgetPerPersonEur: 25,
    rating: { average: 4.8, count: 86 },
    author: { kind: 'member', firstName: 'Camille' },
  },
  friends: {
    id: 'demo-public',
    title: 'Cookies et friperies du Marais',
    durationMin: 90,
    budgetPerPersonEur: 18,
    rating: { average: 4.7, count: 142 },
    author: { kind: 'member', firstName: 'Léa' },
  },
  freeFamily: {
    id: 'demo-public',
    title: 'Buttes-Chaumont, l’autre colline',
    durationMin: 120,
    budgetPerPersonEur: 0,
    rating: { average: 4.8, count: 64 },
    author: { kind: 'member', firstName: 'Nadir' },
  },
  fullDay: {
    id: 'demo-public',
    title: 'Montmartre sans les touristes',
    durationMin: 420,
    budgetPerPersonEur: 40,
    rating: { average: 4.9, count: 128 },
    author: { kind: 'widoo' },
  },
};

/** Example routes of the moods; none online until the API gives them (#239). */
export async function getIdeaRoutes(): Promise<IdeaRoutes> {
  if (process.env.NODE_ENV === 'development' && !site.WIDOO_API_URL) return mockupRoutes;
  return {};
}
