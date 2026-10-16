import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DateCard } from './DateCard';

let mockIsLargeText = false;
jest.mock('../ui/useIsLargeText', () => ({ useIsLargeText: () => mockIsLargeText }));

const card = { day: 'Samedi 26 septembre', hours: 'Départ 10:00, fin vers 17:00' };
const spoken = `${card.day}, ${card.hours}`;

describe('DateCard', () => {
  it('reads the date as one element, « Changer » a button apart', async () => {
    const onChange = jest.fn();
    await render(<DateCard {...card} spoken={spoken} onChange={onChange} />);
    expect(screen.getByLabelText(spoken)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Changer la date' }));
    expect(onChange).toHaveBeenCalled();
  });

  it('keeps « Changer » at large text, and leaves it out while the route is not read', async () => {
    mockIsLargeText = true;
    await render(<DateCard {...card} spoken={spoken} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Changer la date' })).toBeTruthy();
    await render(<DateCard {...card} spoken={spoken} onChange={null} />);
    expect(screen.queryByRole('button', { name: 'Changer la date' })).toBeNull();
  });
});
