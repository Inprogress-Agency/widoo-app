import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Chip } from './Chip';

describe('Chip', () => {
  it('is a button with its label and its state', async () => {
    const onPress = jest.fn();
    await render(<Chip label="Culture" isActive onPress={onPress} />);
    const chip = screen.getByRole('button', { name: 'Culture' });
    expect(chip).toBeSelected();
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalled();
  });
});
