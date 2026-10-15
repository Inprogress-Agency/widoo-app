import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { AppVersions } from '@widoo/shared';
import { Linking, Text } from 'react-native';
import { UpdateGate } from './UpdateGate';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-constants', () => ({ expoConfig: { version: '0.1.0' } }));
jest.mock('react-native-mmkv', () => jest.requireActual('../test/mmkv'));
let mockVersions: AppVersions | undefined;
jest.mock('../profile/me', () => ({
  useAppConfig: () => ({ data: mockVersions && { appVersions: mockVersions } }),
}));

const both = (minVersion: string, recommendedVersion: string): AppVersions => ({
  ios: { minVersion, recommendedVersion },
  android: { minVersion, recommendedVersion },
});

async function renderGate() {
  await render(
    <UpdateGate>
      <Text>Accueil</Text>
    </UpdateGate>,
  );
}

describe('E-20, mise à jour obligatoire', () => {
  beforeEach(() => {
    mockVersions = undefined;
  });

  it('opens the app without an answer of /config', async () => {
    await renderGate();
    expect(screen.getByText('Accueil')).toBeTruthy();
  });

  it('opens the app for a supported version, even one under the recommended', async () => {
    mockVersions = both('0.1.0', '0.2.0');
    await renderGate();
    expect(screen.getByText('Accueil')).toBeTruthy();
  });

  it('blocks a version under the minimum, with the way to the store only', async () => {
    mockVersions = both('0.2.0', '0.2.0');
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await renderGate();
    expect(screen.queryByText('Accueil')).toBeNull();
    expect(screen.getByRole('header', { name: 'Mettez à jour Widoo' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Mettre à jour' }));
    expect(openURL).toHaveBeenCalled();
  });
});
