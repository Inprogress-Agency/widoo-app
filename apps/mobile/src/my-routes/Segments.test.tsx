import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Segments } from './Segments';

describe('Segments', () => {
  it('reads each segment with its place, the one shown selected', async () => {
    const onSelect = jest.fn();
    await render(<Segments selected="upcoming" onSelect={onSelect} />);
    expect(screen.getByLabelText('À venir, 1 sur 4')).toBeSelected();
    expect(screen.getByLabelText('Créés, 4 sur 4')).not.toBeSelected();
    await fireEvent.press(screen.getByLabelText('Passés, 3 sur 4'));
    expect(onSelect).toHaveBeenCalledWith('past');
  });
});
