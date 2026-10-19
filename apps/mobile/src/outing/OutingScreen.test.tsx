import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { ApiRequestError, type RouteSheetAnswer } from '@widoo/api-client';
import { RouteDetail, type PlannedRoute } from '@widoo/shared';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { api } from '../api/client';
import { plannedFixture } from '../go/testPlanned';
import { plannedQueryKey } from '../plan/planned';
import fixtures from '../route/generated/route-sheets.json';
import { RouteSheetSourceContext, type RouteSheetSource } from '../route/source';
import { routeSheetQueryKey } from '../route/useRouteSheet';
import { fakeAuth } from '../test/fakeAuth';
import { showToast } from '../ui/toastStore';
import { OutingScreen } from './OutingScreen';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../api/client', () => ({
  api: { getPlanned: jest.fn(), updatePlanned: jest.fn(), createPlanned: jest.fn() },
}));
jest.mock('../analytics', () => ({
  analytics: { track: jest.fn(), setAuthenticated: jest.fn() },
}));
jest.mock('../api/query-client', () => ({
  queryClient: new (jest.requireActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  ).QueryClient)(),
}));
jest.mock('../go/useGo', () => ({ useStartGo: () => jest.fn() }));
jest.mock('../ui/toastStore', () => ({
  ...jest.requireActual<object>('../ui/toastStore'),
  showToast: jest.fn(),
}));
// E-06 has its own tests: here, only what the page asks of it.
const mockOpenSheet = jest.fn();
jest.mock('../plan/PlanSheet', () => {
  const { useImperativeHandle } = jest.requireActual<typeof import('react')>('react');
  return {
    PlanSheet: ({ ref }: { ref: import('react').Ref<unknown> }) => {
      useImperativeHandle(ref, () => ({ open: mockOpenSheet }));
      return null;
    },
  };
});

const user = { uid: 'uid-1', email: 'camille@exemple.fr', displayName: null };
const route = RouteDetail.parse(fixtures.routes[0]);
// A fictitious outing of the first demo route, in three days at 10:00 in Paris.
const startsAt = new Date(Date.now() + 3 * 86_400_000).toISOString();
const fixture = plannedFixture();
const outing: PlannedRoute = {
  ...fixture,
  status: 'planned',
  routeId: route.id,
  startsAt,
  route: { ...fixture.route, id: route.id, title: route.title },
  timeline: { ...fixture.timeline, startsAt, endsAt: startsAt },
  steps: [],
};

const getPlanned = jest.mocked(api.getPlanned);
const toast = jest.mocked(showToast);

/** The route sheet as the page reads it: answered by the test, or failing. */
function sourceOf(getRoute: RouteSheetSource['getRoute']): RouteSheetSource {
  return { getRoute, getTimeline: async () => route.timeline };
}
const answered = async (): Promise<RouteSheetAnswer> => ({ kind: 'route', route });

let client = new QueryClient();
afterEach(() => client.clear());

async function renderOuting(source: RouteSheetSource, { isListed = true } = {}) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  if (isListed) {
    client.setQueryData(plannedQueryKey(user.uid), { items: [outing], nextCursor: null });
  }
  const onBack = jest.fn();
  const onSeeRoute = jest.fn();
  await render(
    <QueryClientProvider client={client}>
      <RouteSheetSourceContext value={source}>
        <OutingScreen outingId={outing.id} onBack={onBack} onSeeRoute={onSeeRoute} />
      </RouteSheetSourceContext>
    </QueryClientProvider>,
  );
  return { onBack, onSeeRoute };
}

describe('« Votre sortie » (E-08)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    onlineManager.setOnline(true);
    getPlanned.mockResolvedValue(outing);
    await act(() => fakeAuth.setUser(user));
  });

  it('offers « Changer » before the route answers, and opens E-06 once it does', async () => {
    let answer: (value: RouteSheetAnswer) => void = () => undefined;
    const pending = new Promise<RouteSheetAnswer>((resolve) => (answer = resolve));
    await renderOuting(sourceOf(() => pending));
    await fireEvent.press(screen.getByRole('button', { name: 'Changer la date' }));
    expect(mockOpenSheet).not.toHaveBeenCalled();
    await act(async () => answer({ kind: 'route', route }));
    await waitFor(() => expect(mockOpenSheet).toHaveBeenCalledWith(route, outing));
  });

  it('opens E-06 at once on the outing once the route is read', async () => {
    await renderOuting(sourceOf(answered));
    // The programme of the day comes with the route.
    await screen.findAllByText('Maison de Victor Hugo');
    await fireEvent.press(screen.getByRole('button', { name: 'Changer la date' }));
    expect(mockOpenSheet).toHaveBeenCalledWith(route, outing);
  });

  it('says the date cannot change while the route fails, and asks it again', async () => {
    const getRoute = jest.fn(async (): Promise<RouteSheetAnswer> => {
      throw new ApiRequestError('http', 500, null);
    });
    await renderOuting(sourceOf(getRoute));
    // The photo reads the same route: the failure settles once both have asked.
    await waitFor(() =>
      expect(client.getQueryState(routeSheetQueryKey(route.id))).toMatchObject({
        status: 'error',
        fetchStatus: 'idle',
      }),
    );
    // The query tells its observers on the next tick (notifyManager).
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    const calls = getRoute.mock.calls.length;
    await fireEvent.press(screen.getByRole('button', { name: 'Changer la date' }));
    expect(toast).toHaveBeenCalledWith(
      'error',
      'La date ne peut pas être changée pour l’instant',
      expect.objectContaining({ subtitle: 'Vérifiez la connexion, puis réessayez.' }),
    );
    expect(mockOpenSheet).not.toHaveBeenCalled();
    await waitFor(() => expect(getRoute.mock.calls.length).toBeGreaterThan(calls));
  });
});
