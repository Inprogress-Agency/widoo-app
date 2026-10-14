import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { size } from '@widoo/tokens';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';
import { Button } from '../../ui/Button';
import { Text } from '../../ui/Text';
import type { AuthIntent } from '../flow';
import { PRIVACY_URL, TERMS_URL } from '../links';
import type { SignInFailure } from '../provider';
import { ErrorLine, StepTitle } from './parts';

interface ChoicesStepProps {
  intent: AuthIntent;
  error: SignInFailure | null;
  isBusy: boolean;
  onGoogle: () => void;
  onEmail: () => void;
}

/**
 * The three choices of E-10, centred: the title of the action waiting, its line, Google and
 * e-mail (Apple with #388), the conditions in links. Google is the button of its SDK, logo and
 * text included (« Se connecter avec Google »), 48 points high like the others.
 */
export function ChoicesStep({ intent, error, isBusy, onGoogle, onEmail }: ChoicesStepProps) {
  const { t } = useTranslation();
  return (
    <View className="gap-16">
      <View className="gap-6">
        <View className="flex-row">
          <StepTitle>{t(`auth.intent.${intent}.title`)}</StepTitle>
        </View>
        <Text variant="body" color="muted" className="text-center">
          {t(`auth.intent.${intent}.body`)}
        </Text>
      </View>
      {error && <ErrorLine failure={error} />}
      <View className="gap-12">
        <GoogleSigninButton
          size={GoogleSigninButton.Size.Wide}
          color={GoogleSigninButton.Color.Light}
          disabled={isBusy}
          onPress={onGoogle}
          // The text of the SDK, in the language of the phone: the label says what is seen.
          accessibilityLabel={t('auth.google')}
          accessibilityRole="button"
          style={{ alignSelf: 'stretch', height: size['button-h'] }}
        />
        <Button
          label={t('auth.email')}
          icon="email"
          variant="secondary"
          isDense
          isFullWidth
          isDisabled={isBusy}
          onPress={onEmail}
        />
      </View>
      {/* Links in a sentence: separate links, the exception of WCAG 2.5.8 for their size. */}
      <Text variant="body-s" color="muted" className="text-center">
        {t('auth.legal.before')}
        <Text
          variant="body-s"
          color="muted"
          accessibilityRole="link"
          className="underline"
          onPress={() => void Linking.openURL(TERMS_URL)}
        >
          {t('auth.legal.terms')}
        </Text>
        {t('auth.legal.between')}
        <Text
          variant="body-s"
          color="muted"
          accessibilityRole="link"
          className="underline"
          onPress={() => void Linking.openURL(PRIVACY_URL)}
        >
          {t('auth.legal.privacy')}
        </Text>
        {t('auth.legal.after')}
      </Text>
    </View>
  );
}
