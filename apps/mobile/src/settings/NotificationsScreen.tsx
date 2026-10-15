import { defaultNotificationPrefs, type NotificationPrefs } from '@widoo/shared';
import type { UiIconKey } from '@widoo/tokens';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';
import { useMe, useUpdateMe } from '../profile/me';
import { Icon, uiIcon } from '../ui/Icon';
import { SwitchRow } from '../ui/SettingsRow';
import { Text } from '../ui/Text';
import { TextLink } from '../ui/TextLink';
import { showToast } from '../ui/toastStore';
import { usePhoneNotifications } from './phoneNotifications';
import { SettingsPage } from './SettingsPage';

type NotificationKind = keyof NotificationPrefs;

/** The three kinds, in the order of the page (tokens.json › mappings.settings.notifications). */
const kinds: { key: NotificationKind; icon: UiIconKey }[] = [
  { key: 'reminders', icon: 'notif-reminders' },
  { key: 'nextDay', icon: 'notif-next-day' },
  { key: 'myRoutes', icon: 'notif-my-routes' },
];

/**
 * Réglages › Notifications (Ecrans › E-19, D-062): one switch per kind, on by default, kept on the
 * account (`users.notification_prefs`) by `PATCH /me` at once; back to its state on a refusal.
 * When the phone's settings cut the notifications, a box says so and opens them; the switches
 * go inactive, keeping their state (D-061).
 */
export function NotificationsScreen() {
  const { t } = useTranslation();
  const { state } = useMe();
  const update = useUpdateMe();
  const phone = usePhoneNotifications();
  const saved = state.status === 'ready' ? state.me.notificationPrefs : defaultNotificationPrefs;
  // Shown at once, and back to the previous state on a refusal.
  const [shown, setShown] = useState<Partial<NotificationPrefs>>({});
  const prefs = { ...saved, ...shown };
  const isPhoneOff = phone === 'off';

  const toggle = (key: NotificationKind, value: boolean) => {
    setShown((current) => ({ ...current, [key]: value }));
    update.mutate(
      { notificationPrefs: { [key]: value } },
      {
        onError: () => {
          setShown((current) => ({ ...current, [key]: !value }));
          showToast('error', t('notifications.error'), { subtitle: t('notifications.errorBody') });
        },
      },
    );
  };

  return (
    <SettingsPage title={t('notifications.title')} backLabel={t('notifications.back')}>
      {isPhoneOff && (
        <View
          accessibilityRole="summary"
          accessibilityLiveRegion="polite"
          className="flex-row gap-12 rounded-card bg-surface p-16"
        >
          <Icon {...uiIcon('notifications-off')} size="icon-l" />
          <View className="flex-1 items-start gap-8">
            <Text variant="body">{t('notifications.phoneOff')}</Text>
            <TextLink
              label={t('notifications.openSettings')}
              onPress={() => void Linking.openSettings()}
            />
          </View>
        </View>
      )}
      <Text variant="body" color="muted">
        {t('notifications.intro')}
      </Text>
      <View>
        {kinds.map(({ key, icon }) => (
          <SwitchRow
            key={key}
            icon={icon}
            label={t(`notifications.${key}.label`)}
            help={t(`notifications.${key}.help`)}
            value={prefs[key]}
            onValueChange={(value) => toggle(key, value)}
            isDisabled={isPhoneOff}
          />
        ))}
      </View>
    </SettingsPage>
  );
}
