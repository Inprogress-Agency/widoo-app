import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { GoCommands } from './GoCommands';
import { emptyGoLocal, goProgress } from './progress';
import { plannedFixture, stepIds } from './testPlanned';

const at = '2026-10-24T08:22:00.000Z';

function renderCommands(progress = goProgress(plannedFixture(), emptyGoLocal)) {
  const handlers = {
    onDirections: jest.fn(),
    onArrived: jest.fn(),
    onNext: jest.fn(),
    onFinish: jest.fn(),
  };
  return { handlers, view: render(<GoCommands progress={progress} {...handlers} />) };
}

describe('GoCommands', () => {
  it("reads « Itinéraire » before « J'y suis » en route, and neither validates alone", async () => {
    const { handlers, view } = renderCommands();
    await view;
    const directions = screen.getByRole('link', {
      name: 'Itinéraire vers Place fictive, ouvre Google Maps',
    });
    const arrived = screen.getByRole('button', { name: "J'y suis, Place fictive" });
    expect(handlers.onArrived).not.toHaveBeenCalled();
    await fireEvent.press(directions);
    expect(handlers.onDirections).toHaveBeenCalled();
    expect(handlers.onArrived).not.toHaveBeenCalled();
    await fireEvent.press(arrived);
    expect(handlers.onArrived).toHaveBeenCalled();
  });

  it('offers the next step on site, then « Terminer la sortie » on the last one', async () => {
    const onSite = goProgress(plannedFixture(), { ...emptyGoLocal, arrivedStepIds: [stepIds[0]] });
    const { handlers, view } = renderCommands(onSite);
    await view;
    await fireEvent.press(screen.getByRole('button', { name: 'Étape suivante : Musée fictif' }));
    expect(handlers.onNext).toHaveBeenCalled();
    expect(screen.queryByRole('link')).toBeNull();

    const last = goProgress(plannedFixture({ 0: { doneAt: at }, 1: { doneAt: at } }), {
      ...emptyGoLocal,
      arrivedStepIds: [stepIds[2]],
    });
    const second = renderCommands(last);
    await second.view;
    await fireEvent.press(screen.getByRole('button', { name: 'Terminer la sortie' }));
    expect(second.handlers.onFinish).toHaveBeenCalled();
  });
});
