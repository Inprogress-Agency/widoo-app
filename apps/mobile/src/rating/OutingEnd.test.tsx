import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { PlannedRoute } from '@widoo/shared';
import { accessibility } from '@widoo/tokens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { plannedFixture } from '../go/testPlanned';
import { OutingEnd } from './OutingEnd';

const at = '2026-10-24T09:00:00.000Z';

/** The fixture of three steps, completed at 16:50 in Paris. */
function ended(
  progress: Parameters<typeof plannedFixture>[0],
  myRating: PlannedRoute['myRating'] = null,
): PlannedRoute {
  return {
    ...plannedFixture(progress),
    status: 'completed',
    completedAt: '2026-10-24T14:50:00.000Z',
    closedBy: 'user',
    myRating,
  };
}
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const dense = accessibility.maxFontSizeMultiplierDense;
const capOf = (text: string) =>
  screen.getByText(text, { includeHiddenElements: true }).props.maxFontSizeMultiplier as number;
const allDone = { 0: { doneAt: at }, 1: { doneAt: at }, 2: { doneAt: at } };

async function renderEnd(outing: PlannedRoute) {
  const onFinish = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <OutingEnd outing={outing} onFinish={onFinish} />
    </SafeAreaProvider>,
  );
  return onFinish;
}

describe('OutingEnd (E-15)', () => {
  it('sums up the outing, title in header and tiles in a list', async () => {
    await renderEnd(ended(allDone));
    expect(screen.getByRole('header', { name: 'Sortie terminée' })).toBeTruthy();
    expect(screen.getByLabelText('3 étapes faites sur 3')).toBeTruthy();
    expect(screen.getByLabelText('6 heures 50 de sortie')).toBeTruthy();
    expect(screen.getByLabelText('fin à 16 heures 50')).toBeTruthy();
    // Tiles and sticky bar capped at 1.3 at large text sizes (D-034).
    expect([capOf('3 sur 3'), capOf('étapes faites'), capOf('Terminer')]).toEqual([
      dense,
      dense,
      dense,
    ]);
  });

  it('finishes without a rating, then with one and its comment', async () => {
    const onFinish = await renderEnd(ended(allDone));
    expect(screen.getByText('Touchez une étoile. La note est facultative.')).toBeTruthy();
    expect(screen.queryByLabelText('Un mot pour les autres, facultatif')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Terminer' }));
    expect(onFinish).toHaveBeenLastCalledWith(null);

    const star = screen.getByRole('radio', { name: '4 sur 5, Très bien' });
    await fireEvent.press(star);
    expect(
      screen.getByRole('radio', { name: '4 sur 5, Très bien' }).props.accessibilityState,
    ).toEqual({
      checked: true,
    });
    expect(screen.getByText('Très bien')).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText('Un mot pour les autres, facultatif'),
      'Superbe',
    );
    const counter = screen.getByText('7 / 280', { includeHiddenElements: true });
    // Never cut: neither a line limit nor a shrink, it goes under the help when short of room.
    expect(counter.props.numberOfLines).toBeUndefined();
    await fireEvent.press(screen.getByRole('button', { name: 'Terminer' }));
    expect(onFinish).toHaveBeenLastCalledWith({ rating: 4, comment: 'Superbe' });
  });

  it('shows an existing rating, to change', async () => {
    const mine = { rating: 2, comment: 'Trop de monde', createdAt: at, updatedAt: at };
    const onFinish = await renderEnd(ended(allDone, mine));
    expect(screen.getByText('Moyen')).toBeTruthy();
    expect(screen.getByDisplayValue('Trop de monde')).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: '5 sur 5, Parfait' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Terminer' }));
    expect(onFinish).toHaveBeenLastCalledWith({ rating: 5, comment: 'Trop de monde' });
  });

  it('offers no stars under half of the steps done, skipped ones aside', async () => {
    await renderEnd(ended({ 0: { doneAt: at }, 1: { skippedAt: at } }));
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.getByText('Note à partir de 2 étapes faites')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Terminer' })).toBeTruthy();
  });

  it('opens the stars from half of the steps done, even with a step skipped', async () => {
    await renderEnd(ended({ 0: { doneAt: at }, 1: { doneAt: at }, 2: { skippedAt: at } }));
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });
});
