import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DayChips, TimeStepper } from './PlanControls';

// Friday 25 September 2026, as the boards of E-06.
const today = '2026-09-25';

describe('DayChips', () => {
  it('tells the day chosen as selected, and opens the calendar from « Autre date »', async () => {
    const onChange = jest.fn();
    const onOtherDate = jest.fn();
    await render(
      <DayChips day="2026-09-26" today={today} onChange={onChange} onOtherDate={onOtherDate} />,
    );
    const tomorrow = screen.getByRole('button', { name: 'Demain, samedi 26 septembre' });
    expect(tomorrow.props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByRole('button', { name: 'dimanche 27 septembre' }));
    expect(onChange).toHaveBeenCalledWith('2026-09-27');
    await fireEvent.press(screen.getByRole('button', { name: 'Autre date' }));
    expect(onOtherDate).toHaveBeenCalled();
  });

  it('shows the day of the calendar in place of « Autre date »', async () => {
    await render(
      <DayChips day="2026-10-10" today={today} onChange={jest.fn()} onOtherDate={jest.fn()} />,
    );
    expect(screen.getAllByText('Sam. 10 oct.').length).toBeGreaterThan(0);
    expect(screen.queryByText('Autre date')).toBeNull();
  });
});

describe('TimeStepper', () => {
  it('moves by 15 minutes, never before the first time still to come', async () => {
    const onChange = jest.fn();
    await render(<TimeStepper minute={600} minMinute={600} onChange={onChange} />);
    expect(screen.getByLabelText('Départ à 10:00').props.maxFontSizeMultiplier).toBe(1.2);
    const earlier = screen.getByRole('button', { name: 'Partir 15 minutes plus tôt' });
    expect(earlier.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByRole('button', { name: 'Partir 15 minutes plus tard' }));
    expect(onChange).toHaveBeenCalledWith(615);
  });
});
