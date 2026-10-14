import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button } from '../../ui/Button';
import { SheetTextField } from '../../ui/SheetTextField';
import { isEmailAddress } from '../links';
import type { SignInFailure } from '../provider';
import { ErrorLine, StepHeader } from './parts';

interface EmailStepProps {
  initialEmail: string;
  /** A link opened on another device: the address confirms it instead of asking for one. */
  isConfirm: boolean;
  error: SignInFailure | null;
  isBusy: boolean;
  onBack: () => void;
  onSubmit: (email: string) => void;
}

/**
 * « Continuer avec un e-mail », on the keyboard: an e-mail keyboard, the address of the keychain
 * offered, « Recevoir le lien » (Ecrans › E-10, e-mail).
 */
export function EmailStep({
  initialEmail,
  isConfirm,
  error,
  isBusy,
  onBack,
  onSubmit,
}: EmailStepProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState(initialEmail);
  const isValid = isEmailAddress(email);
  const submit = () => {
    if (isValid && !isBusy) {
      onSubmit(email);
    }
  };
  return (
    <View className="gap-16">
      <StepHeader title={t('auth.email')} backLabel={t('auth.back')} onBack={onBack} />
      <SheetTextField
        label={t('auth.emailStep.label')}
        help={isConfirm ? t('auth.emailStep.confirmHelp') : t('auth.emailStep.help')}
        value={email}
        onChangeText={setEmail}
        isFocusedOnOpen
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        autoCapitalize="none"
        returnKeyType="send"
        maxLength={254}
        onSubmitEditing={submit}
      />
      {error && <ErrorLine failure={error} />}
      <Button
        label={isConfirm ? t('auth.emailStep.confirm') : t('auth.emailStep.submit')}
        isFullWidth
        isDisabled={!isValid || isBusy}
        onPress={submit}
      />
    </View>
  );
}
