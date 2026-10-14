import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { RouteDetail, type RouteDetailStep } from '@widoo/shared';
import fixtures from '../route/generated/route-sheets.json';
import { localTimeline } from './notice';
import { Programme, ProgrammeUnavailable } from './Programme';

// « Le Marais à l'abri de la pluie » of the demo, on Tuesday 29 September 2026.
const steps = RouteDetail.parse(fixtures.routes[0]).steps as RouteDetailStep[];
const tuesday = '2026-09-29';

describe('Programme', () => {
  it('lists the steps with their time, and the expected end', async () => {
    await render(
      <Programme steps={steps} timeline={localTimeline(steps, tuesday, 600)} day={tuesday} />,
    );
    expect(
      screen.getByRole('header', { name: 'Le programme, Départ 10:00, fin vers 14:03' }),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(/^10:00, Maison de Victor Hugo, Musée, 45 minutes, 7 minutes à pied/),
    ).toBeTruthy();
    expect(screen.getByLabelText('Fin prévue vers 14:03')).toBeTruthy();
  });

  it('marks a step closed at the arrival and the last day of an ephemeral one', async () => {
    const ending = steps.map((step, index) =>
      index === 2 ? { ...step, endsOn: '2027-01-17' } : step,
    );
    await render(
      <Programme steps={ending} timeline={localTimeline(ending, tuesday, 17 * 60)} day={tuesday} />,
    );
    expect(screen.getAllByText('Fermé à votre arrivée (ferme à 18:00)').length).toBeGreaterThan(0);
    expect(screen.getByText("Jusqu'au 17 janv.")).toBeTruthy();
  });

  it('offers to compute it again when it is unavailable', async () => {
    const onRetry = jest.fn();
    await render(<ProgrammeUnavailable onRetry={onRetry} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Réessayer le calcul du programme' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
