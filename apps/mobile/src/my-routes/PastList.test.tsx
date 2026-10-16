import { describe, expect, it, jest } from '@jest/globals';
import type { PlannedRoute } from '@widoo/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { plannedFixture } from '../go/testPlanned';
import { PastList } from './PastList';

jest.mock('../route/useRouteSheet', () => ({
  useRouteSheet: () => ({ state: { status: 'loading', known: null } }),
}));

const doneAt = '2026-10-24T09:00:00.000Z';
const now = new Date('2026-11-02T10:00:00.000Z');
const outing = (overrides: Partial<PlannedRoute>): PlannedRoute => ({
  ...plannedFixture({ 0: { doneAt }, 1: { doneAt }, 2: { doneAt } }),
  status: 'completed',
  completedAt: '2026-10-24T12:00:00.000Z',
  ...overrides,
});

describe('PastList', () => {
  it('offers « Noter » apart from the line, naming the route', async () => {
    const onAction = jest.fn();
    const onOpen = jest.fn();
    const item = outing({});
    await render(<PastList outings={[item]} now={now} onOpen={onOpen} onAction={onAction} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Noter, Parcours fictif' }));
    expect(onAction).toHaveBeenCalledWith(item, 'rate');
    await fireEvent.press(
      screen.getByRole('link', { name: 'Parcours fictif, Fait le samedi 24 octobre' }),
    );
    expect(onOpen).toHaveBeenCalledWith(item);
  });

  it('reads my rating with the line, without « Noter »', async () => {
    const rated = outing({
      myRating: { rating: 5, comment: null, createdAt: doneAt, updatedAt: doneAt },
    });
    await render(<PastList outings={[rated]} now={now} onOpen={jest.fn()} onAction={jest.fn()} />);
    expect(
      screen.getByRole('link', {
        name: 'Parcours fictif, Fait le samedi 24 octobre, Votre note, 5 sur 5, Parfait',
      }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Noter/ })).toBeNull();
  });

  it('reads the pill of a stopped outing and offers « Relancer »', async () => {
    const onAction = jest.fn();
    const stopped = outing({ status: 'stopped', completedAt: null });
    await render(<PastList outings={[stopped]} now={now} onOpen={jest.fn()} onAction={onAction} />);
    expect(
      screen.getByRole('link', { name: 'Parcours fictif, Samedi 24 octobre, Arrêté' }),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Relancer, Parcours fictif' }));
    expect(onAction).toHaveBeenCalledWith(stopped, 'relaunch');
  });
});
