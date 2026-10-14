import { size } from '@widoo/tokens';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Button } from '../../ui/Button';
import { Text } from '../../ui/Text';
import { TextLink } from '../../ui/TextLink';
import type { SignInFailure } from '../provider';
import { ErrorLine, StepHeader, StepIcon } from './parts';

/** « Renvoyer » waits this long after a link (Ecrans › E-10, e-mail envoyé). */
export const RESEND_DELAY_MS = 30_000;

const SECOND = 1000;
const linkHitSlop = size['touch-min'] / 4;

/** Seconds left before « Renvoyer », counted from the last link sent, 30 at most. */
function useSecondsLeft(sentAt: number) {
  const [now, setNow] = useState(Date.now);
  const seconds = Math.min(
    RESEND_DELAY_MS / SECOND,
    Math.max(0, Math.ceil((sentAt + RESEND_DELAY_MS - now) / SECOND)),
  );
  useEffect(() => {
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= sentAt + RESEND_DELAY_MS) {
        clearInterval(timer);
      }
    }, SECOND);
    return () => clearInterval(timer);
  }, [sentAt]);
  return seconds;
}

interface SentStepProps {
  email: string;
  sentAt: number;
  error: SignInFailure | null;
  isBusy: boolean;
  onBack: () => void;
  onOpenMail: () => void;
  onResend: () => void;
  onChangeAddress: () => void;
}

/**
 * « Vérifiez vos e-mails »: the address, « Ouvrir ma messagerie », « Renvoyer dans 30 s » greyed
 * then active, « Changer d'adresse ». The countdown is not told: the screen readers hear
 * « Renvoyer dans 30 secondes, estompé » once.
 */
export function SentStep({
  email,
  sentAt,
  error,
  isBusy,
  onBack,
  onOpenMail,
  onResend,
  onChangeAddress,
}: SentStepProps) {
  const { t } = useTranslation();
  const seconds = useSecondsLeft(sentAt);
  const canResend = seconds === 0 && !isBusy;
  return (
    <View className="gap-16">
      <StepHeader title={t('auth.sent.title')} backLabel={t('auth.sent.back')} onBack={onBack} />
      <StepIcon icon="email-sent" tone="blue" />
      <View accessible accessibilityRole="text" className="gap-8">
        <Text variant="body" className="text-center">
          {t('auth.sent.body')}
          {'\n'}
          <Text variant="item">{email}</Text>
        </Text>
        <Text variant="body-s" color="muted" className="text-center">
          {t('auth.sent.hint')}
        </Text>
      </View>
      {error && <ErrorLine failure={error} />}
      <Button label={t('auth.sent.openMail')} isFullWidth onPress={onOpenMail} />
      <View className="flex-row flex-wrap items-center justify-around gap-x-16 gap-y-8">
        {canResend ? (
          <TextLink label={t('auth.sent.resend')} role="button" onPress={onResend} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('auth.sent.resendInSpoken')}
            accessibilityState={{ disabled: true }}
            disabled
            hitSlop={linkHitSlop}
          >
            <Text variant="button" color="muted">
              {t('auth.sent.resendIn', { seconds: seconds || 1 })}
            </Text>
          </Pressable>
        )}
        <TextLink label={t('auth.sent.changeAddress')} role="button" onPress={onChangeAddress} />
      </View>
    </View>
  );
}
