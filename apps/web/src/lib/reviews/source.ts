import 'server-only';
import { site } from '@/config/site';
import type { AppReview } from './types';

/**
 * Example of the mockup (E-21): shown in development only, to review the design of the block.
 * Never online: the block stays hidden until real reviews come from the API (#239).
 */
const exampleReview: AppReview = {
  rating: 5,
  text: 'Un dimanche à Montmartre sans rien préparer : tout était juste, même les horaires.',
  firstName: 'Marion',
  date: '2026-09-25',
  store: 'appStore',
};

/** Reviews of the hero; none online until the API gives real ones (#239). */
export async function getHeroReviews(): Promise<AppReview[]> {
  if (process.env.NODE_ENV === 'development' && !site.WIDOO_API_URL) return [exampleReview];
  return [];
}
