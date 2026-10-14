import { describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { RouteDetail } from '@widoo/shared';
import { createRef } from 'react';
import fixtures from '../route/generated/route-sheets.json';
import { PlanSheet, type PlanChoice, type PlanSheetMethods } from './PlanSheet';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual('@gorhom/bottom-sheet/mock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../ui/OverModals', () => ({
  OverModals: ({ children }: { children: unknown }) => children,
}));

// « Le Marais à l'abri de la pluie » of the demo, its timeline computed on its fixture.
const route = RouteDetail.parse(fixtures.routes[0]);
// Monday 28 September 2026 at 8:00 in Paris: the museums are closed today.
const now = () => new Date('2026-09-28T06:00:00Z');

async function renderSheet(isOnline = true) {
  const ref = createRef<PlanSheetMethods>();
  const onSubmit = jest.fn<(choice: PlanChoice) => Promise<boolean>>(async () => true);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  await render(
    <QueryClientProvider client={client}>
      <PlanSheet
        ref={ref}
        isOnline={isOnline}
        onSubmit={onSubmit}
        onToggleBooking={jest.fn()}
        onBook={jest.fn()}
        now={now}
      />
    </QueryClientProvider>,
  );
  await act(async () => ref.current?.open(route, null));
  return { ref, onSubmit };
}

describe('PlanSheet', () => {
  it('opens on today at the suggested start, and tells a place closed that day', async () => {
    await renderSheet();
    expect(screen.getByLabelText(`Programmer la sortie, ${route.title}`)).toBeTruthy();
    expect(screen.getByLabelText('Départ à 14:00')).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByText('Maison de Victor Hugo sera fermé ce jour-là')).toBeTruthy(),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Choisir le mardi 29 septembre' }));
    await waitFor(() =>
      expect(screen.getByText('Fin vers 18:03. Tous les lieux seront ouverts.')).toBeTruthy(),
    );
    expect(
      screen.getByRole('header', { name: 'Le programme, Départ 14:00, fin vers 18:03' }),
    ).toBeTruthy();
  });

  it('goes to the calendar and back with the day chosen', async () => {
    await renderSheet();
    await fireEvent.press(screen.getByRole('button', { name: 'Autre date' }));
    expect(screen.getByRole('header', { name: 'Choisir une date' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '30 septembre' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Retour aux jours proposés' }));
    expect(screen.getByRole('header', { name: 'Programmer la sortie' })).toBeTruthy();
  });

  it('keeps the day and the time readable offline, without the programme', async () => {
    await renderSheet(false);
    expect(
      screen.getByLabelText('Hors connexion. Les horaires des lieux ne peuvent pas être vérifiés.'),
    ).toBeTruthy();
    expect(screen.queryByText('Le programme')).toBeNull();
  });
});
