import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { PhotoCredit } from './PhotoCredit';

// A fictitious free photo of Wikimedia Commons.
const credit = {
  author: 'J. Moreau',
  license: 'CC BY-SA 4.0',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Exemple.jpg',
};

describe('PhotoCredit', () => {
  it('shows « © author », read as the whole credit', async () => {
    await render(<PhotoCredit credit={credit} />);
    expect(screen.getByText('© J. Moreau')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Photo de J. Moreau, licence CC BY-SA 4.0' }),
    ).toBeTruthy();
  });

  it('opens the bubble on a tap, and its source on Wikimedia Commons', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await render(<PhotoCredit credit={credit} />);
    await fireEvent.press(screen.getByRole('button', { name: /Photo de J. Moreau/ }));
    expect(screen.getByText('Photo de J. Moreau')).toBeTruthy();
    expect(screen.getByText('CC BY-SA 4.0')).toBeTruthy();
    await fireEvent.press(screen.getByRole('link', { name: 'Voir sur Wikimedia Commons' }));
    expect(openURL).toHaveBeenCalledWith(credit.sourceUrl);
    expect(screen.queryByText('Photo de J. Moreau')).toBeNull();
  });

  it('closes the bubble on a touch elsewhere', async () => {
    await render(<PhotoCredit credit={credit} />);
    await fireEvent.press(screen.getByRole('button', { name: /Photo de J. Moreau/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Fermer le crédit' }));
    expect(screen.queryByText('Photo de J. Moreau')).toBeNull();
  });
});
