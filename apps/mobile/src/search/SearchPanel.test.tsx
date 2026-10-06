import { describe, expect, it, jest } from '@jest/globals';
import type { GeocodeZone, RouteCard } from '@widoo/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { RecentZone } from './recentZones';
import { SearchPanel } from './SearchPanel';
import { textSearchView, type Group, type TextSearchInput } from './textSearch';

// Fictitious zone and route.
const zone: GeocodeZone = {
  id: 'zone-canal',
  name: 'Canal fictif',
  kind: 'neighborhood',
  area: 'Paris 10e',
  center: { lat: 48.871, lng: 2.365 },
  bbox: { west: 2.345, south: 48.857, east: 2.385, north: 48.885 },
  routeCount: 18,
};
const route = {
  id: 'route-canal',
  title: 'Le canal en douceur',
  coverUrl: null,
  moods: ['nature'],
  district: '10e',
  neighborhood: 'République',
  rating: { average: 4.8, count: 12 },
} as unknown as RouteCard;
const recent: RecentZone = { ...zone, id: 'zone-recent', name: 'Quartier récent' };

const done = <T,>(data: T): Group<T> => ({ status: 'success', data, isFetching: false });
const failed: Group<never> = { status: 'error', data: undefined, isFetching: false };

function renderPanel(overrides: Partial<TextSearchInput>) {
  const input: TextSearchInput = {
    text: 'canal',
    settled: 'canal',
    isOnline: true,
    zones: done([zone]),
    routes: done([route]),
    ...overrides,
  };
  const handlers = {
    onChooseZone: jest.fn(),
    onRemoveRecent: jest.fn(),
    onClearRecent: jest.fn(),
    onAroundMe: jest.fn(),
    onOpenRoute: jest.fn(),
    retryZones: jest.fn(),
    retryRoutes: jest.fn(),
  };
  const view = textSearchView(input);
  return {
    handlers,
    rendering: render(
      <SearchPanel
        text={input.text}
        view={view}
        input={input}
        recentZones={[recent]}
        {...handlers}
      />,
    ),
  };
}

describe('SearchPanel', () => {
  it('reads a zone with its type, its area and its number of routes', async () => {
    const { handlers, rendering } = renderPanel({});
    await rendering;
    const row = screen.getByRole('button', {
      name: 'Canal fictif, Quartier, Paris 10e, 18 parcours',
    });
    await fireEvent.press(row);
    expect(handlers.onChooseZone).toHaveBeenCalledWith(zone);
    expect(
      screen.getByRole('button', {
        name: 'Parcours Le canal en douceur, Nature, 10e, République, note 4,8 sur 5',
      }),
    ).toBeTruthy();
  });

  it('keeps the routes when the zones fail, and retries the zones alone', async () => {
    const { handlers, rendering } = renderPanel({ zones: failed });
    await rendering;
    expect(screen.getByText('Zones indisponibles pour le moment')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Parcours Le canal en douceur/ })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Réessayer les zones' }));
    expect(handlers.retryZones).toHaveBeenCalled();
    expect(handlers.retryRoutes).not.toHaveBeenCalled();
  });

  it('keeps the zones when the routes fail, and retries the routes alone', async () => {
    const { handlers, rendering } = renderPanel({ routes: failed });
    await rendering;
    expect(screen.getByText('Parcours indisponibles pour le moment')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Réessayer les parcours' }));
    expect(handlers.retryRoutes).toHaveBeenCalled();
    expect(handlers.retryZones).not.toHaveBeenCalled();
  });

  it('retries both after the total error', async () => {
    const { handlers, rendering } = renderPanel({ zones: failed, routes: failed });
    await rendering;
    expect(screen.getByText('La recherche ne répond pas')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Réessayer' }));
    expect(handlers.retryZones).toHaveBeenCalled();
    expect(handlers.retryRoutes).toHaveBeenCalled();
  });

  it('shows the recent zones offline with the empty field, and only the line once typing', async () => {
    const empty = renderPanel({ text: '', settled: '', isOnline: false });
    await empty.rendering;
    expect(screen.getByText('Hors connexion · recherche indisponible')).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: "Retirer Quartier récent de l'historique" }),
    );
    expect(empty.handlers.onRemoveRecent).toHaveBeenCalledWith('zone-recent');
    await fireEvent.press(
      screen.getByRole('button', { name: 'Effacer toutes les recherches récentes' }),
    );
    expect(empty.handlers.onClearRecent).toHaveBeenCalled();

    await renderPanel({ isOnline: false }).rendering;
    expect(screen.queryByText('Quartier récent')).toBeNull();
    expect(screen.getByText(/^Effacez la saisie/)).toBeTruthy();
  });

  it('tells that nothing was found for the text', async () => {
    await renderPanel({ zones: done([]), routes: done([]) }).rendering;
    expect(screen.getByText('Aucune zone ni parcours pour « canal »')).toBeTruthy();
  });
});
