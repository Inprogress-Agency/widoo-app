import { colors, type UiIconKey } from '@widoo/tokens';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSession } from '../auth';
import type { AccountProvider } from '../auth/provider';
import { useMe } from '../profile/me';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { SettingsPage } from './SettingsPage';

/** The relay of « Masquer mon adresse e-mail » of Sign in with Apple. */
const APPLE_RELAY = /@privaterelay\.appleid\.com$/i;

/** The address of the account, or « Masquée par Apple » for the relay of Apple. */
function useAccountEmail(): { email: string | null; isHidden: boolean } {
  const { state } = useMe();
  const email = state.status === 'ready' ? state.me.email : null;
  return { email, isHidden: email !== null && APPLE_RELAY.test(email) };
}

interface MethodCardProps {
  icon: UiIconKey;
  /** Apple's mark is white on ink; the others ink on white. */
  isInk?: boolean;
  title: string;
  subtitle: string;
}

/** A warm grey card with its mark in a disc of 44 points, read as one element. */
function MethodCard({ icon, isInk = false, title, subtitle }: MethodCardProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${title}, ${subtitle}`}
      className="flex-row items-center gap-16 rounded-card bg-surface p-16"
    >
      <View
        className="size-disc items-center justify-center rounded-pill"
        style={{ backgroundColor: isInk ? colors.ink : colors.bg }}
      >
        <Icon {...uiIcon(icon)} size="icon-l" color={isInk ? 'on-strong' : 'ink'} />
      </View>
      <View className="flex-1 gap-4">
        <Text variant="item">{title}</Text>
        <Text variant="body-s" color="muted">
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

/**
 * Réglages › E-mail (Ecrans › E-19, D-062): the address of the account, never cut, or « Masquée
 * par Apple ». Changing it by a confirmation link comes with its API (#202).
 */
export function EmailScreen() {
  const { t } = useTranslation();
  const { email, isHidden } = useAccountEmail();
  return (
    <SettingsPage title={t('email.title')} backLabel={t('email.back')}>
      <View className="gap-8">
        <Text variant="status" color="muted" accessibilityRole="header">
          {t('email.section')}
        </Text>
        <MethodCard
          icon="email"
          title={isHidden || !email ? t('email.hidden') : email}
          subtitle={t('email.current')}
        />
      </View>
      <Text variant="body-s" color="muted">
        {t('email.usage')}
      </Text>
    </SettingsPage>
  );
}

const methodIcons: Record<AccountProvider, UiIconKey> = {
  apple: 'login-method',
  google: 'login-method',
  email: 'email',
};

/**
 * Réglages › Connexion (Ecrans › E-19, D-062), read only: the method of the account, its address
 * and what to choose on a new phone. Neither adding nor removing a method at the MVP; the link
 * « Changer d'adresse » comes with the change of address (#202).
 */
export function SignInMethodScreen() {
  const { t } = useTranslation();
  const provider = useSession((state) => state.user?.provider ?? null) ?? 'email';
  const { email, isHidden } = useAccountEmail();
  return (
    <SettingsPage title={t('signInMethod.title')} backLabel={t('signInMethod.back')}>
      <MethodCard
        icon={methodIcons[provider]}
        isInk={provider === 'apple'}
        title={t(`signInMethod.${provider}.title`)}
        subtitle={t(`signInMethod.${provider}.subtitle`)}
      />
      <View accessible className="gap-4 border-b border-line pb-12">
        <Text variant="status" color="muted">
          {t('signInMethod.address')}
        </Text>
        <Text variant="body">{isHidden || !email ? t('email.hidden') : email}</Text>
      </View>
      <Text variant="body-s" color="muted">
        {isHidden ? t('signInMethod.relay') : t(`signInMethod.${provider}.newPhone`)}
      </Text>
    </SettingsPage>
  );
}
