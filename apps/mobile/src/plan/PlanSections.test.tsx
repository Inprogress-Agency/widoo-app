import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { RouteDetail, type RouteDetailStep } from '@widoo/shared';
import fixtures from '../route/generated/route-sheets.json';
import { Checklist } from './Checklist';
import { PlanNotice } from './PlanNotice';

// Friday 25 September 2026, as the boards of E-06; a fictitious booking on a demo step.
const today = '2026-09-25';
const step = RouteDetail.parse(fixtures.routes[0]).steps[0] as RouteDetailStep;
const booking: RouteDetailStep = {
  ...step,
  bookingRequired: true,
  bookingUrl: 'https://example.com/reserver',
  bookingNote: 'Conseillé le week-end',
  costPerPersonEur: 15,
  bookingIsAffiliate: true,
};

describe('PlanNotice', () => {
  it('sets the suggested start of a place closed at the arrival', async () => {
    const onMinute = jest.fn();
    await render(
      <PlanNotice
        notice={{
          kind: 'closedAtArrival',
          place: 'Café Lomi',
          arrival: '18:25',
          hours: { relation: 'closes', time: '18:00' },
          suggestion: 840,
        }}
        today={today}
        onMinute={onMinute}
        onDay={jest.fn()}
      />,
    );
    expect(
      screen.getByLabelText(
        'Café Lomi sera fermé à votre arrivée. Vous arriveriez vers 18:25, il ferme à 18:00.',
      ).props.accessibilityRole,
    ).toBe('alert');
    await fireEvent.press(screen.getByRole('button', { name: 'Partir à 14:00' }));
    expect(onMinute).toHaveBeenCalledWith(840);
  });
});

describe('Checklist', () => {
  it('ticks a booking, counts it, and links to the site of the place', async () => {
    const onToggle = jest.fn();
    const onBook = jest.fn();
    await render(
      <Checklist
        bookings={[booking]}
        checked={new Set([booking.id])}
        onToggle={onToggle}
        onBook={onBook}
      />,
    );
    expect(screen.getByRole('header', { name: 'À préparer, 1 sur 1 préparés' })).toBeTruthy();
    const box = screen.getByRole('checkbox', {
      name: 'Réserver Maison de Victor Hugo, Conseillé le week-end, 15 € par pers.',
    });
    expect(box.props.accessibilityState).toMatchObject({ checked: true });
    await fireEvent.press(box);
    expect(onToggle).toHaveBeenCalledWith(booking);
    await fireEvent.press(screen.getByRole('link', { name: 'Réserver Maison de Victor Hugo' }));
    expect(onBook).toHaveBeenCalledWith(booking);
    expect(screen.getByText('Lien affilié')).toBeTruthy();
  });
});
