import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { ApiRequestError, type RouteSheetAnswer } from '@widoo/api-client';
import { RouteDetail, type PlannedRoute, type RouteDetailStep } from '@widoo/shared';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';
import { analytics } from '../analytics';
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
const marais = RouteDetail.parse(fixtures.routes[0]);
// A fictitious booking at the second step, the Musée Carnavalet.
const route: RouteDetail = {
  ...marais,
  steps: marais.steps.map((step, index) =>
    index === 1 ? { ...(step as RouteDetailStep), bookingRequired: true } : step,
  ),
};
const bookingId = route.steps[1]?.id ?? '';
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
const updatePlanned = jest.mocked(api.updatePlanned);
const track = jest.mocked(analytics.track);
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
  it('titles the page and reads the outing from « À venir » at once', async () => {
    const { onSeeRoute } = await renderOuting(sourceOf(answered));
    expect(screen.getByRole('header', { name: 'Votre sortie' })).toBeTruthy();
    expect(screen.getByRole('header', { name: route.title })).toBeTruthy();
    expect(screen.getByLabelText(/^[A-Z][a-z]+ \d+ [a-zéû]+, Départ \d\d:\d\d/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Annuler la sortie' })).toBeTruthy();
    expect(screen.getByRole('button', { name: `C'est parti, ${route.title}` })).toBeTruthy();
    await fireEvent.press(screen.getByRole('link', { name: 'Voir la fiche du parcours' }));
    expect(onSeeRoute).toHaveBeenCalledWith(route.id);
  });

  it('asks the outing when « À venir » does not hold it, and again after a failure', async () => {
    getPlanned.mockRejectedValueOnce(new ApiRequestError('http', 500, null));
    await renderOuting(sourceOf(answered), { isListed: false });
    await screen.findByText('Votre sortie ne se charge pas');
    expect(screen.queryByRole('button', { name: /^C'est parti/ })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Réessayer' }));
    await screen.findByRole('button', { name: 'Changer la date' });
    expect(getPlanned).toHaveBeenCalledTimes(2);
  });

  it('says an outing no longer to come, without « C’est parti »', async () => {
    getPlanned.mockResolvedValue({ ...outing, status: 'cancelled' });
    await renderOuting(sourceOf(answered), { isListed: false });
    await screen.findByText("Cette sortie n'est plus à venir");
    expect(screen.queryByRole('button', { name: /^C'est parti/ })).toBeNull();
  });

  it('cancels after the system alert, then « Rétablir » brings the outing back', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    updatePlanned.mockResolvedValue(outing);
    const { onBack } = await renderOuting(sourceOf(answered));
    await fireEvent.press(screen.getByRole('button', { name: 'Annuler la sortie' }));
    const buttons = (alert.mock.calls[0]?.[2] ?? []) as AlertButton[];
    expect(buttons.map((button) => button.text)).toEqual(['Annuler la sortie', 'Garder']);
    await act(async () => buttons[0]?.onPress?.());
    expect(updatePlanned).toHaveBeenCalledWith(outing.id, { status: 'cancelled' });
    expect(onBack).toHaveBeenCalled();
    const event = { route_id: route.id, days_ahead: expect.any(Number) };
    expect(track).toHaveBeenCalledWith('plan_cancelled', event);
    const cancelled = toast.mock.calls.find((call) => call[1] === 'Sortie annulée');
    expect(cancelled?.[2]?.action?.label).toBe('Rétablir');
    await act(async () => cancelled?.[2]?.action?.onPress());
    expect(updatePlanned).toHaveBeenLastCalledWith(outing.id, { status: 'planned' });
    expect(track).toHaveBeenCalledWith('plan_restored', event);
    expect(toast).toHaveBeenLastCalledWith('success', 'Sortie rétablie', expect.anything());
    alert.mockRestore();
  });

  it('keeps a box ticked from the server, and gives it back its state on a failure', async () => {
    getPlanned.mockResolvedValue({
      ...outing,
      checklist: [{ stepId: bookingId, isChecked: true }],
    });
    await renderOuting(sourceOf(answered), { isListed: false });
    const box = await screen.findByRole('checkbox', { name: /Musée Carnavalet/ });
    expect(box.props.accessibilityState).toMatchObject({ checked: true });
    updatePlanned.mockRejectedValueOnce(new ApiRequestError('network', null, null));
    await fireEvent.press(box);
    expect(updatePlanned).toHaveBeenCalledWith(outing.id, {
      checklist: [{ stepId: bookingId, isChecked: false }],
    });
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        'error',
        "La case n'a pas pu être enregistrée",
        expect.anything(),
      ),
    );
    expect(
      screen.getByRole('checkbox', { name: /Musée Carnavalet/ }).props.accessibilityState,
    ).toMatchObject({ checked: true });
  });
});
