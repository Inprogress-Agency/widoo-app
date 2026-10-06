import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SearchPill } from './SearchPill';

const noop = () => undefined;

describe('SearchPill', () => {
  it('names the filters button with the count of active filters, and opens the panel', async () => {
    const onOpen = jest.fn();
    await render(<SearchPill filterCount={3} onOpenFilters={onOpen} onOpenSearch={noop} />);
    const button = screen.getByRole('button', { name: 'Filtres, 3 actifs' });
    expect(button.props.accessibilityHint).toBe('Ouvre une fenêtre');
    // The badge is drawn, but the button alone says the count.
    expect(screen.queryByText('3')).toBeNull();
    expect(screen.getByText('3', { includeHiddenElements: true })).toBeTruthy();
    await fireEvent.press(button);
    expect(onOpen).toHaveBeenCalled();
  });

  it('has no badge without filter', async () => {
    await render(<SearchPill filterCount={0} onOpenFilters={jest.fn()} onOpenSearch={noop} />);
    expect(screen.getByRole('button', { name: 'Filtres' })).toBeTruthy();
    expect(screen.queryByText('0', { includeHiddenElements: true })).toBeNull();
  });

  it('opens the search, read as a search field (Ecrans › E-01)', async () => {
    const onOpenSearch = jest.fn();
    await render(<SearchPill filterCount={0} onOpenFilters={noop} onOpenSearch={onOpenSearch} />);
    const field = screen.getByRole('search', { name: 'Rechercher une zone ou un parcours' });
    // The test renderer reports a font scale of 2: the short text of large sizes.
    expect(screen.getByText("Qu'est-ce qu'on fait ?")).toBeTruthy();
    await fireEvent.press(field);
    expect(onOpenSearch).toHaveBeenCalled();
  });

  it('names the zone chosen, with a cross back around the user', async () => {
    const onLeaveZone = jest.fn();
    await render(
      <SearchPill
        filterCount={0}
        onOpenFilters={noop}
        onOpenSearch={noop}
        zoneName="Canal fictif"
        onLeaveZone={onLeaveZone}
      />,
    );
    expect(screen.getByText('Canal fictif')).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Quitter Canal fictif et revenir autour de moi' }),
    );
    expect(onLeaveZone).toHaveBeenCalled();
  });
});
