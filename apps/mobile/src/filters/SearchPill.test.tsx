import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SearchPill } from './SearchPill';

describe('SearchPill', () => {
  it('names the filters button with the count of active filters, and opens the panel', async () => {
    const onOpen = jest.fn();
    await render(<SearchPill filterCount={3} onOpenFilters={onOpen} />);
    const button = screen.getByRole('button', { name: 'Filtres, 3 actifs' });
    expect(button.props.accessibilityHint).toBe('Ouvre une fenêtre');
    // The badge is drawn, but the button alone says the count.
    expect(screen.queryByText('3')).toBeNull();
    expect(screen.getByText('3', { includeHiddenElements: true })).toBeTruthy();
    await fireEvent.press(button);
    expect(onOpen).toHaveBeenCalled();
  });

  it('has no badge without filter', async () => {
    await render(<SearchPill filterCount={0} onOpenFilters={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Filtres' })).toBeTruthy();
    expect(screen.queryByText('0', { includeHiddenElements: true })).toBeNull();
  });
});
