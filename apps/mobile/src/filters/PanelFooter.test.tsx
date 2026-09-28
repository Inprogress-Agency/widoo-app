import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { FilterCount } from '../discovery/filterCount';
import { PanelFooter } from './PanelFooter';

function renderFooter(count: FilterCount) {
  const handlers = { onApply: jest.fn(), onReset: jest.fn(), onRemoveGroup: jest.fn() };
  return { handlers, rendered: render(<PanelFooter count={count} {...handlers} />) };
}

describe('PanelFooter', () => {
  it('offers « Voir N parcours » and « Réinitialiser »', async () => {
    const { handlers, rendered } = renderFooter({ status: 'counted', count: 9, suggestions: [] });
    await rendered;
    await fireEvent.press(screen.getByRole('button', { name: 'Voir 9 parcours' }));
    expect(handlers.onApply).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Réinitialiser les filtres' }));
    expect(handlers.onReset).toHaveBeenCalled();
  });

  it('stays usable while counting, busy', async () => {
    const { handlers, rendered } = renderFooter({ status: 'counting' });
    await rendered;
    const button = screen.getByRole('button', { name: 'Calcul du nombre de parcours' });
    expect(button).toBeBusy();
    expect(button).toBeEnabled();
    expect(screen.getByText('Calcul en cours')).toBeTruthy();
    await fireEvent.press(button);
    expect(handlers.onApply).toHaveBeenCalled();
  });

  it('disables the button at zero and offers the groups to remove, with their gain', async () => {
    const { handlers, rendered } = renderFooter({
      status: 'counted',
      count: 0,
      suggestions: [
        { group: 'durations', filters: [{ group: 'durations', value: 'weekend' }], gain: 12 },
        { group: 'conditions', filters: [{ group: 'conditions', value: 'wheelchair' }], gain: 5 },
      ],
    });
    await rendered;
    expect(screen.getByRole('button', { name: 'Aucun parcours' })).toBeDisabled();
    expect(screen.getByText(/Aucun parcours ne réunit tous ces critères/)).toBeTruthy();
    expect(screen.getByText('+12')).toBeTruthy();
    const suggestion = screen.getByRole('button', {
      name: 'Retirer Plus de 12 heures, 12 parcours de plus',
    });
    await fireEvent.press(suggestion);
    expect(handlers.onRemoveGroup).toHaveBeenCalledWith(
      expect.objectContaining({ group: 'durations' }),
    );
  });

  it('shows the button without number when the count is unavailable', async () => {
    const { handlers, rendered } = renderFooter({ status: 'unavailable' });
    await rendered;
    expect(screen.getByText('Nombre de parcours indisponible pour le moment')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Voir les parcours' }));
    expect(handlers.onApply).toHaveBeenCalled();
  });

  it('offline, filters the routes already loaded and offers no suggestion', async () => {
    const { rendered } = renderFooter({ status: 'offline' });
    await rendered;
    expect(screen.getByText('Hors connexion · sur les parcours déjà chargés')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Voir les parcours' })).toBeEnabled();
    expect(screen.queryByText(/Essayez de retirer/)).toBeNull();
  });
});
