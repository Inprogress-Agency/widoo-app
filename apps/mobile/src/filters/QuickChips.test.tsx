import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { discoveryStore } from '../discovery/useRouteSearch';
import { renderWithQueries, resetDiscovery } from '../test/render';
import { QuickChips } from './QuickChips';

jest.mock('../analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('../api/client', () => ({ api: {} }));

const chipNames = () =>
  screen.getAllByRole('button').map((chip) => chip.props.accessibilityLabel as string);

describe('QuickChips', () => {
  beforeEach(resetDiscovery);

  it('starts with Gratuit, then the publics, Extérieur and the moods', async () => {
    await renderWithQueries(<QuickChips />);
    expect(chipNames().slice(0, 7)).toEqual([
      'Gratuit',
      'Couple',
      'Solo',
      'Famille',
      'Entre amis',
      'Extérieur',
      'Culture',
    ]);
    expect(screen.getByRole('button', { name: 'Culture' })).not.toBeSelected();
  });

  it('adds a filter on a tap, searches the zone again and puts the chip first', async () => {
    await renderWithQueries(<QuickChips />);
    await fireEvent.press(screen.getByRole('button', { name: 'Culture' }));
    expect(discoveryStore.getState().filters).toEqual({ moods: ['culture'] });
    expect(discoveryStore.getState().search).toMatchObject({ filtersSource: 'chip' });
    const chip = screen.getByRole('button', { name: 'Culture, filtre actif' });
    expect(chip).toBeSelected();
    expect(chipNames()[0]).toBe('Culture, filtre actif');
  });

  it('shows the filters of the panel first too, and removes one on a tap', async () => {
    discoveryStore.setState({ filters: { budgets: ['low'], durations: ['weekend'] } });
    await renderWithQueries(<QuickChips />);
    expect(chipNames().slice(0, 2)).toEqual([
      "Jusqu'à 25 euros par personne, filtre actif",
      'Plus de 12 heures, filtre actif',
    ]);
    // Amounts are read in words, and written as in packages/shared.
    const budget = screen.getByRole('button', { name: /Jusqu'à 25 euros/ });
    expect(within(budget).getAllByText("Jusqu'à 25 €").length).toBeGreaterThan(0);
    await fireEvent.press(budget);
    expect(discoveryStore.getState().filters).toEqual({ durations: ['weekend'] });
  });
});
