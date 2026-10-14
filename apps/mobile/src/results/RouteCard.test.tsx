import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { analytics } from '../analytics';
import { testCard } from '../test/publicProfile';
import { RouteCard } from './RouteCard';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../analytics', () => ({ analytics: { track: jest.fn() } }));

const card = testCard('6a1d3c2b-0e4f-4a5b-8c7d-9e0f1a2b3c4d', 'Canal Saint-Martin');

describe('RouteCard, its creator line', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the profile of the creator from « Par Camille », with creator_profile_opened', async () => {
    await render(<RouteCard route={card} position={null} onPress={jest.fn()} />);
    // Out of the screen reader's reach: the card reads it, with its action.
    await fireEvent.press(screen.getByText('Par Camille', { includeHiddenElements: true }));
    expect(analytics.track).toHaveBeenCalledWith('creator_profile_opened', {
      creator_id: card.author?.id,
      source: 'card',
    });
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/creator/[id]',
      params: { id: card.author?.id, name: 'Camille' },
    });
  });

  it('offers the profile as an action of the card for screen readers', async () => {
    await render(<RouteCard route={card} position={null} onPress={jest.fn()} />);
    const element = screen.getByRole('button', { name: /^Canal Saint-Martin/ });
    expect(element.props.accessibilityActions).toContainEqual({
      name: 'creator',
      label: 'Voir le profil de Camille',
    });
  });

  it.each([
    ['a creator who is not public, « Membre Widoo »', { ...card, author: null }, true],
    ['a route of Widoo', { ...card, isOfficial: true, author: null }, true],
    ['a card on the profile of its creator', card, false],
  ])('does not open any profile for %s', async (_case, route, isCreatorLinked) => {
    await render(
      <RouteCard
        route={route}
        position={null}
        onPress={jest.fn()}
        isCreatorLinked={isCreatorLinked}
      />,
    );
    const element = screen.getByRole('button', { name: /^Canal Saint-Martin/ });
    expect(element.props.accessibilityActions).toEqual([
      { name: 'favorite', label: 'Ajouter aux favoris' },
    ]);
  });
});
