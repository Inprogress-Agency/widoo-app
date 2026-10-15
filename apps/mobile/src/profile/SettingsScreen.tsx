import type { Me } from '@widoo/shared';
import { spacing } from '@widoo/tokens';
import { router } from 'expo-router';
import { BottomTabBarHeightContext } from 'expo-router/tabs';
import { use, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { session } from '../auth';
import { signInFlow } from '../auth/signIn';
import { Button } from '../ui/Button';
import { dateFormat } from '../i18n/formats';
import { useLanguageChoice } from '../i18n/language';
import { usePhoneNotifications } from '../settings/phoneNotifications';
import { SettingsRow, SettingsSection, SwitchRow } from '../ui/SettingsRow';
import { Text } from '../ui/Text';
import { showToast } from '../ui/toastStore';
import { TopBar } from '../ui/TopBar';
import { useMe, useUpdateMe } from './me';
import { PremiumCard } from './PremiumCard';
import { appVersion, openStoreSubscriptions } from './store';

/**
 * Réglages (Ecrans › E-09), pushed over my profile with the tab bar in place (M-03); each row
 * opens its page of E-19. Without account (D-063): a card to sign in, the preferences, the
 * information and the version.
 */
export function SettingsScreen() {
  const { t } = useTranslation();
  const tabBarHeight = use(BottomTabBarHeightContext) ?? 0;
  const { state } = useMe();
  const me = state.status === 'ready' ? state.me : null;
  const { version, build } = appVersion();
  const { choice } = useLanguageChoice();
  const isPhoneOff = usePhoneNotifications() === 'off';

  return (
    <View className="flex-1 bg-bg">
      <TopBar
        title={t('settings.title')}
        back={{ label: t('settings.back'), onPress: () => router.back() }}
      />
      <ScrollView
        contentContainerClassName="gap-8 px-16 pt-16"
        // Tab bar height measured at runtime.
        contentContainerStyle={{ paddingBottom: spacing['space-32'] + tabBarHeight }}
      >
        {state.status === 'anonymous' && <SignedOutCard />}
        {me && <AccountSettings me={me} />}
        <SettingsSection title={t('settings.preferences')}>
          {me && (
            <SettingsRow
              icon="notifications"
              label={t('settings.notifications')}
              value={isPhoneOff ? t('settings.notificationsOff') : undefined}
              onPress={() => router.push('/settings/notifications')}
            />
          )}
          <SettingsRow
            icon="language"
            label={t('settings.language')}
            value={choice === 'device' ? t('language.device') : t(`language.${choice}`)}
            onPress={() => router.push('/language')}
          />
          <SettingsRow
            icon="privacy-settings"
            label={t('settings.privacy')}
            onPress={() => router.push('/settings/privacy')}
          />
        </SettingsSection>
        <SettingsSection title={t('settings.information')}>
          <SettingsRow
            icon="legal"
            label={t('settings.terms')}
            onPress={() => router.push('/settings/terms')}
          />
          <SettingsRow
            icon="privacy"
            label={t('settings.privacyPolicy')}
            onPress={() => router.push('/settings/privacy-policy')}
          />
          <SettingsRow
            icon="help"
            label={t('settings.help')}
            onPress={() => router.push('/settings/help')}
          />
        </SettingsSection>
        {me && (
          <SettingsSection title={t('settings.session')}>
            <SettingsRow
              icon="sign-out"
              label={t('settings.signOut')}
              role="button"
              onPress={() => {
                void session.signOut();
                router.back();
              }}
            />
            <SettingsRow
              icon="delete"
              label={t('settings.deleteAccount')}
              onPress={() => router.push('/delete-account')}
            />
          </SettingsSection>
        )}
        <Text variant="label" color="muted" className="pt-16 text-center">
          {build
            ? t('settings.versionBuild', { version, build })
            : t('settings.version', { version })}
        </Text>
      </ScrollView>
    </View>
  );
}

/**
 * The account part: Premium (the card for a free account, the subscription for a subscriber),
 * then the e-mail, which shows nowhere else, the sign-in and « Profil public ».
 */
function AccountSettings({ me }: { me: Me }) {
  const { t } = useTranslation();
  const update = useUpdateMe();
  // Shown at once; back to the account's value if the API refuses it.
  const [isPublic, setIsPublic] = useState(me.isPublic);
  const togglePublic = (value: boolean) => {
    setIsPublic(value);
    update.mutate(
      { isPublic: value },
      {
        onError: () => {
          setIsPublic(!value);
          showToast('error', t('settings.publicProfileError'), {
            subtitle: t('settings.publicProfileErrorBody'),
            isAboveTabBar: true,
          });
        },
      },
    );
  };
  const isPremium = me.plan === 'premium';
  return (
    <>
      {isPremium ? (
        <SettingsSection title={t('settings.subscription')}>
          <SettingsRow
            icon="premium"
            label={t('settings.premium')}
            help={
              me.planExpiresAt
                ? t('settings.premiumUntil', {
                    date: dateFormat({ day: 'numeric', month: 'long', year: 'numeric' }).format(
                      new Date(me.planExpiresAt),
                    ),
                  })
                : undefined
            }
            trailingLabel={t('settings.manage')}
            isExternal
            onPress={openStoreSubscriptions}
          />
        </SettingsSection>
      ) : (
        <PremiumCard />
      )}
      <SettingsSection title={t('settings.account')}>
        {me.email && (
          <SettingsRow
            icon="email"
            label={t('settings.email')}
            value={me.email}
            onPress={() => router.push('/settings/email')}
          />
        )}
        <SettingsRow
          icon="login-method"
          label={t('settings.signIn')}
          onPress={() => router.push('/settings/sign-in')}
        />
        <SwitchRow
          icon="public-profile"
          label={t('settings.publicProfile')}
          help={t('settings.publicProfileHelp')}
          value={isPublic}
          onValueChange={togglePublic}
        />
      </SettingsSection>
    </>
  );
}

/** Without account (Ecrans › E-19, D-063): what the account brings, and the way to E-10. */
function SignedOutCard() {
  const { t } = useTranslation();
  return (
    <View className="gap-12 rounded-card bg-surface p-16">
      <View className="gap-4">
        <Text variant="title-s">{t('settings.signedOutTitle')}</Text>
        <Text variant="body-s" color="muted">
          {t('settings.signedOutBody')}
        </Text>
      </View>
      <Button
        label={t('settings.signedOutAction')}
        isFullWidth
        onPress={() => void signInFlow.requireAccount('profile', () => undefined)}
      />
    </View>
  );
}
