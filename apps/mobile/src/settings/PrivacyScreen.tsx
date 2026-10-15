import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, View } from 'react-native';
import { consent, useConsent } from '../analytics';
import { api } from '../api/client';
import { useIsOnline } from '../discovery/useRouteSearch';
import { useMe } from '../profile/me';
import { Button } from '../ui/Button';
import { SettingsRow, SettingsSection, SwitchRow } from '../ui/SettingsRow';
import { Text } from '../ui/Text';
import { showToast } from '../ui/toastStore';
import { shareDataExport } from './dataExport';
import { SettingsPage } from './SettingsPage';

/**
 * Réglages › Confidentialité (Ecrans › E-19, D-063), with or without account: « Mesure
 * d'audience », whose switch withdraws the consent at once, PostHog cut without confirmation
 * (D-060); with an account, « Télécharger mes données »; then the policy and « Nous écrire sur
 * vos données ».
 */
export function PrivacyScreen() {
  const { t } = useTranslation();
  const { state } = useMe();
  const isGranted = useConsent() === 'granted';
  const hasAccount = state.status === 'ready';

  const toggleAnalytics = (value: boolean) => {
    consent.set(value ? 'granted' : 'denied');
    if (value) {
      showToast('success', t('privacy.analyticsOn'));
    } else {
      showToast('info', t('privacy.analyticsOff'), { subtitle: t('privacy.analyticsOffBody') });
    }
  };

  return (
    <SettingsPage title={t('privacy.title')} backLabel={t('privacy.back')}>
      <View className="gap-12">
        <SwitchRow
          icon="analytics"
          label={t('privacy.analytics')}
          help={t('privacy.analyticsHelp')}
          value={isGranted}
          onValueChange={toggleAnalytics}
        />
        <Text variant="body-s" color="muted">
          {t('consent.body')}
        </Text>
        {!hasAccount && (
          <Text variant="body-s" color="muted">
            {t('privacy.withoutAccount')}
          </Text>
        )}
      </View>
      {hasAccount && <DataExport />}
      <SettingsSection title={t('privacy.learnMore')}>
        <SettingsRow
          icon="privacy"
          label={t('settings.privacyPolicy')}
          onPress={() => router.push('/settings/privacy-policy')}
        />
        <SettingsRow
          icon="email"
          label={t('privacy.writeAboutData')}
          onPress={() => router.push('/settings/contact?topic=data')}
        />
      </SettingsSection>
    </SettingsPage>
  );
}

/**
 * « Vos données »: `GET /me/export`, a few seconds, then the share sheet of the phone with the
 * file. Offline, the button waits; a failure says so and offers to try again.
 */
function DataExport() {
  const { t } = useTranslation();
  const isOnline = useIsOnline();
  const exportData = useMutation({
    mutationFn: async () => shareDataExport(await api.exportMyData()),
    networkMode: 'always',
    onMutate: () => AccessibilityInfo.announceForAccessibility(t('privacy.preparing')),
    onError: () =>
      showToast('error', t('privacy.exportError'), {
        subtitle: t('privacy.exportErrorBody'),
        action: { label: t('privacy.retry'), onPress: () => exportData.mutate() },
      }),
  });
  const isBusy = exportData.isPending;
  return (
    <SettingsSection title={t('privacy.yourData')}>
      <Text variant="body-s" color="muted">
        {t('privacy.yourDataBody')}
      </Text>
      <View className="pt-8">
        <Button
          label={isBusy ? t('privacy.preparing') : t('privacy.download')}
          icon={isBusy ? 'loading' : 'export-data'}
          variant="secondary"
          isFullWidth
          isDisabled={!isOnline || isBusy}
          onPress={() => exportData.mutate()}
        />
      </View>
      {!isOnline && (
        <Text variant="body-s" color="muted">
          {t('privacy.offline')}
        </Text>
      )}
    </SettingsSection>
  );
}
