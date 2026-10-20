import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { GoStepAlert } from './GoStepAlert';
import { emptyGoLocal, goProgress } from './progress';
import { plannedFixture } from './testPlanned';

/** The park of the fixture, planned for 45 min, closes at `closes` in Paris (10:20 is 08:20Z). */
function progressAt(now: string, closes = '10:20') {
  const planned = plannedFixture();
  const park = planned.route.steps[0];
  if (park) {
    park.place.hours = [{ weekday: 5, opens: '08:00', closes, validFrom: null, validTo: null }];
  }
  return goProgress(planned, emptyGoLocal, new Date(now));
}

describe('the step alert of E-07', () => {
  it('tells a step that will close before half of its time, and skips it in one press', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    const onSkip = jest.fn();
    await render(<GoStepAlert progress={progressAt('2026-10-24T08:05:00.000Z')} onSkip={onSkip} />);
    expect(screen.getByText('Place fictive ferme à 10:20')).toBeTruthy();
    expect(screen.getByText('Vous arriverez vers 10:05, il restera 15\u00a0min.')).toBeTruthy();
    expect(announce).toHaveBeenCalledWith(
      'Place fictive ferme à 10 heures 20. Vous arriverez vers 10 heures 5, il restera 15 minutes.',
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Passer cette étape, Place fictive' }),
    );
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('says nothing while the step leaves half of its time or more', async () => {
    await render(
      <GoStepAlert progress={progressAt('2026-10-24T08:05:00.000Z', '11:00')} onSkip={jest.fn()} />,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });
});
