import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { renderWithQueries } from '../test/render';
import { ReviewsScreen } from './ReviewsScreen';

jest.mock('../api/client', () => ({ api: { listRouteRatings: jest.fn() } }));
jest.mock('../analytics', () => ({ analytics: { track: jest.fn() } }));

const listRouteRatings = jest.mocked(api.listRouteRatings);
const routeId = '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e21';
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const review = (id: string, firstName: string, rating: number) => ({
  id,
  firstName,
  rating,
  comment: `Avis de ${firstName}`,
  createdAt: '2026-09-17T10:00:00.000Z',
});

describe('ReviewsScreen', () => {
  it('lists every review page after page, each rating as a figure after a star', async () => {
    listRouteRatings
      .mockResolvedValueOnce({ items: [review('a', 'Camille', 5)], nextCursor: 'next' })
      .mockResolvedValueOnce({ items: [review('b', 'Hugo', 3)], nextCursor: null });
    await renderWithQueries(
      <SafeAreaProvider initialMetrics={metrics}>
        <ReviewsScreen routeId={routeId} onBack={() => undefined} />
      </SafeAreaProvider>,
    );
    expect(
      await screen.findByLabelText('Camille, 17 sept., note 5 sur 5, Avis de Camille'),
    ).toBeTruthy();
    expect(screen.getByText('5', { includeHiddenElements: true })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: "Voir plus d'avis" }));
    expect(await screen.findByLabelText('Hugo, 17 sept., note 3 sur 5, Avis de Hugo')).toBeTruthy();
    expect(listRouteRatings).toHaveBeenLastCalledWith(
      routeId,
      { cursor: 'next' },
      expect.anything(),
    );
    expect(screen.queryByRole('button', { name: "Voir plus d'avis" })).toBeNull();
  });
});
