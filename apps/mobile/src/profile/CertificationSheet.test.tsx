import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { testMe } from '../test/me';
import { CertificationSheet } from './CertificationSheet';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual('@gorhom/bottom-sheet/mock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);

describe('Créateur certifié sheet', () => {
  it('reads each criterion as one element, with my value and its state', async () => {
    await render(
      <CertificationSheet
        certification={{
          isCertified: false,
          certifiedAt: null,
          criteria: [
            { criterion: 'verifiedRoutes', value: 2, threshold: 3, isMet: false },
            { criterion: 'averageRating', value: 4.6, threshold: 4.5, isMet: true },
            { criterion: 'completedRoutes', value: null, threshold: 3, isMet: false },
          ],
        }}
      />,
    );
    expect(screen.getByRole('header', { name: 'Devenez créateur certifié' })).toBeTruthy();
    expect(
      screen.getByLabelText('3 parcours vérifiés ou plus, 2 sur 3, pas encore rempli'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Note moyenne de 4,5 ou plus, 4,6, rempli')).toBeTruthy();
    expect(screen.getByLabelText('3 parcours réalisés ou plus, 0, pas encore rempli')).toBeTruthy();
  });

  it('titles the sheet of a certified creator', async () => {
    await render(<CertificationSheet certification={testMe().certification} />);
    expect(screen.getByRole('header', { name: 'Créateur certifié' })).toBeTruthy();
  });

  it('tells a visitor why the creator has the badge, and closes on « Compris » (E-16)', async () => {
    await render(
      <CertificationSheet certification={testMe().certification} creatorName="Camille" />,
    );
    expect(screen.getByRole('header', { name: 'Créateur certifié' })).toBeTruthy();
    expect(
      screen.getByText('Camille propose des parcours fiables et remplit les critères de Widoo.'),
    ).toBeTruthy();
    expect(screen.getByText("Sur l'ensemble de ses parcours.")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Compris' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Créer un parcours' })).toBeNull();
  });
});
