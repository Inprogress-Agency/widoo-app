import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { accessibility } from '@widoo/tokens';
import { SettingsRow, SwitchRow } from './SettingsRow';
import { TopBar } from './TopBar';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);

describe('TopBar', () => {
  it('caps its title and its actions at 1.3, the title on two lines at most', async () => {
    await render(
      <TopBar
        title="Modifier le profil"
        leading={{ label: 'Annuler', onPress: () => undefined }}
        trailing={{ label: 'Enregistrer', onPress: () => undefined }}
      />,
    );
    for (const text of ['Modifier le profil', 'Annuler', 'Enregistrer']) {
      expect(screen.getByText(text).props.maxFontSizeMultiplier).toBe(
        accessibility.maxFontSizeMultiplierDense,
      );
    }
    expect(screen.getByRole('header', { name: 'Modifier le profil' }).props.numberOfLines).toBe(2);
  });

  it('says a busy action and does not run it twice', async () => {
    const onPress = jest.fn();
    await render(
      <TopBar
        title="Modifier le profil"
        trailing={{ label: 'Enregistrer', onPress, isBusy: true }}
      />,
    );
    const save = screen.getByRole('button', { name: 'Enregistrer' });
    expect(save.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    await fireEvent.press(save);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('goes back by its disc', async () => {
    const onPress = jest.fn();
    await render(<TopBar title="Réglages" back={{ label: 'Retour au profil', onPress }} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Retour au profil' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('Settings rows', () => {
  it('reads a row with its value, as a link when it leads somewhere', async () => {
    const onPress = jest.fn();
    await render(
      <SettingsRow icon="legal" label="Conditions d'utilisation" onPress={onPress} isExternal />,
    );
    await fireEvent.press(screen.getByRole('link', { name: "Conditions d'utilisation" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('never cuts the value: no line limit on the e-mail', async () => {
    await render(<SettingsRow icon="email" label="E-mail" value="camille@exemple.fr" />);
    expect(screen.getByText('camille@exemple.fr').props.numberOfLines).toBeUndefined();
    expect(screen.getByLabelText('E-mail, camille@exemple.fr')).toBeTruthy();
  });

  it('makes the whole row the switch', async () => {
    const onValueChange = jest.fn();
    await render(
      <SwitchRow
        icon="public-profile"
        label="Profil public"
        help="Vos parcours mènent à votre profil."
        value
        onValueChange={onValueChange}
      />,
    );
    const row = screen.getByRole('switch', { name: 'Profil public' });
    expect(row.props.accessibilityState).toMatchObject({ checked: true });
    await fireEvent.press(row);
    expect(onValueChange).toHaveBeenCalledWith(false);
  });
});
