import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { discoveryStore } from '../discovery/useRouteSearch';
import { renderWithQueries, resetDiscovery } from '../test/render';
import { FiltersPanel } from './FiltersPanel';
import { QuickChips } from './QuickChips';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual('@gorhom/bottom-sheet/mock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('../api/client', () => ({ api: {} }));

async function openPanel() {
  await act(async () => {
    discoveryStore.getState().openFilters();
  });
}

describe('FiltersPanel', () => {
  beforeEach(resetDiscovery);

  it('shows the six groups as headers, the budgets and durations of packages/shared', async () => {
    await renderWithQueries(<FiltersPanel />);
    await openPanel();
    for (const group of ['Public', 'Budget par personne', 'Durée', 'Déplacement', 'Ambiance']) {
      expect(screen.getByRole('header', { name: group })).toBeTruthy();
    }
    expect(screen.getByRole('header', { name: 'Conditions' })).toBeTruthy();
    expect(screen.getAllByText('Plus de 70 €').length).toBeGreaterThan(0);
    expect(screen.getAllByText("Jusqu'à 2 h 30").length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: "Jusqu'à 2 heures 30" })).toBeTruthy();
  });

  it('shows the state of the quick chips: one state for both', async () => {
    await renderWithQueries(
      <>
        <QuickChips />
        <FiltersPanel />
      </>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Culture' }));
    await openPanel();
    expect(screen.getByLabelText('Filtres, 1 actif')).toBeTruthy();
    // The quick chip reads « filtre actif »; the chip of the panel is the other « Culture ».
    expect(screen.getByRole('button', { name: 'Culture' })).toBeSelected();
  });

  it('changes the draft only, and restores the filters when closed', async () => {
    discoveryStore.setState({ filters: { moods: ['nature'] } });
    await renderWithQueries(<FiltersPanel />);
    await openPanel();
    await fireEvent.press(screen.getByRole('button', { name: 'Plus de 70 euros par personne' }));
    expect(screen.getByRole('button', { name: 'Plus de 70 euros par personne' })).toBeSelected();
    expect(discoveryStore.getState().filters).toEqual({ moods: ['nature'] });
    await fireEvent.press(screen.getByRole('button', { name: 'Fermer les filtres' }));
    expect(discoveryStore.getState().draft).toBeNull();
    expect(discoveryStore.getState().filters).toEqual({ moods: ['nature'] });
  });
});
