import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button } from '../../ui/Button';
import { Text } from '../../ui/Text';
import { TextLink } from '../../ui/TextLink';
import { StepIcon, StepTitle } from './parts';

interface ExpiredStepProps {
  email: string;
  isBusy: boolean;
  onResend: () => void;
  onChangeAddress: () => void;
}

/** « Ce lien n'est plus valable »: expired or already used (Ecrans › E-10, lien expiré). */
export function ExpiredStep({ email, isBusy, onResend, onChangeAddress }: ExpiredStepProps) {
  const { t } = useTranslation();
  return (
    <View className="gap-16">
      <StepIcon icon="link-expired" tone="surface" />
      <View className="gap-6">
        <View className="flex-row">
          <StepTitle>{t('auth.expired.title')}</StepTitle>
        </View>
        <Text variant="body" color="muted" className="text-center">
          {email ? t('auth.expired.body', { email }) : t('auth.expired.bodyNoEmail')}
        </Text>
      </View>
      {email ? (
        <Button
          label={t('auth.expired.resend')}
          isFullWidth
          isDisabled={isBusy}
          onPress={onResend}
        />
      ) : null}
      {/* A row: the link keeps to its text, centred. */}
      <View className="flex-row justify-center">
        <TextLink label={t('auth.sent.changeAddress')} role="button" onPress={onChangeAddress} />
      </View>
    </View>
  );
}
