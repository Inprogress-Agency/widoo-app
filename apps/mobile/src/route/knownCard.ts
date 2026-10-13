import type { QueryClient } from '@tanstack/react-query';
import { RouteCard } from '@widoo/shared';

/** Pages a cached query holds: a search answer, or the pages of a « Voir tout » list. */
function pagesOf(data: unknown): unknown[] {
  if (typeof data !== 'object' || data === null) {
    return [];
  }
  return 'pages' in data && Array.isArray(data.pages) ? data.pages : [data];
}

function itemsOf(page: unknown): unknown[] {
  return typeof page === 'object' && page !== null && 'items' in page && Array.isArray(page.items)
    ? page.items
    : [];
}

/**
 * The card of a route among the searches and lists in the cache (Ecrans › E-05, chargement):
 * what the sheet shows at once, before its detail answers; null when no list holds it.
 */
export function knownCard(client: QueryClient, id: string): RouteCard | null {
  for (const query of client.getQueryCache().findAll({ queryKey: ['routes'] })) {
    for (const page of pagesOf(query.state.data)) {
      const item = itemsOf(page).find(
        (candidate) =>
          typeof candidate === 'object' &&
          candidate !== null &&
          'id' in candidate &&
          candidate.id === id,
      );
      const card = RouteCard.safeParse(item);
      if (card.success) {
        return card.data;
      }
    }
  }
  return null;
}
