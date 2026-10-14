import { FirstName } from '@widoo/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button } from '../../ui/Button';
import { SheetTextField } from '../../ui/SheetTextField';
import { Text } from '../../ui/Text';
import type { SignInFailure } from '../provider';
import { ErrorLine, StepTitle } from './parts';

interface WelcomeStepProps {
  initialFirstName: string;
  /** Prefilled by Google: the step can be skipped, by closing the sheet. */
  isPrefilled: boolean;
  error: SignInFailure | null;
  isBusy: boolean;
  onSubmit: (firstName: string) => void;
}

/**
 * First sign-in, on the keyboard: « Bienvenue sur Widoo », « Prénom ou pseudo », « Continuer »,
 * inactive while the field is empty (Ecrans › E-10, première connexion).
 */
export function WelcomeStep({
  initialFirstName,
  isPrefilled,
  error,
  isBusy,
  onSubmit,
}: WelcomeStepProps) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState(initialFirstName);
  const isValid = FirstName.safeParse(firstName.trim()).success;
  const submit = () => {
    if (isValid && !isBusy) {
      onSubmit(firstName);
    }
  };
  return (
    <View className="gap-16">
      <View className="gap-6">
        <View className="flex-row">
          <StepTitle>{t('auth.welcome.title')}</StepTitle>
        </View>
        <Text variant="body" color="muted" className="text-center">
          {isPrefilled ? t('auth.welcome.body') : t('auth.welcome.bodyRequired')}
        </Text>
      </View>
      <SheetTextField
        label={t('auth.welcome.label')}
        help={isPrefilled ? t('auth.welcome.prefilledGoogle') : undefined}
        placeholder={t('auth.welcome.placeholder')}
        value={firstName}
        onChangeText={setFirstName}
        isFocusedOnOpen
        textContentType="givenName"
        autoComplete="given-name"
        autoCapitalize="words"
        returnKeyType="done"
        maxLength={50}
        onSubmitEditing={submit}
      />
      {error && <ErrorLine failure={error} />}
      <Button
        label={t('auth.welcome.submit')}
        isFullWidth
        isDisabled={!isValid || isBusy}
        onPress={submit}
      />
    </View>
  );
}
