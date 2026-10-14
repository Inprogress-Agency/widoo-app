import type { UiIconKey } from '@widoo/tokens';
import { spacing } from '@widoo/tokens';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../ui/Button';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { TextLink } from '../ui/TextLink';
import { showToast } from '../ui/toastStore';
import { TopBar } from '../ui/TopBar';
import { deleteAccount, useMe } from './me';
import { openStoreSubscriptions } from './store';

const erased = [
  { key: 'profile', icon: 'tab-profile' },
  { key: 'outings', icon: 'favorite' },
  { key: 'drafts', icon: 'private' },
] as const satisfies readonly { key: string; icon: UiIconKey }[];

/**
 * Supprimer mon compte (Ecrans › E-09, D-025), pushed without the tab bar (M-03): what is erased,
 * the published routes that stay online signed « Membre Widoo », no choice; for a subscriber, the
 * store subscription that goes on. The ink button asks the system alert, then `DELETE /me`: the
 * app goes back to the Profil tab without account, with the toast « Votre compte est supprimé. ».
 */
export function DeleteAccountScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { state } = useMe();
  const [isBusy, setIsBusy] = useState(false);
  const isSubscriber = state.status === 'ready' && state.me.plan === 'premium';

  const remove = async () => {
    setIsBusy(true);
    try {
      await deleteAccount();
      router.dismissTo('/profile');
      showToast('success', t('profile.deleted'), { isAboveTabBar: true });
    } catch {
      setIsBusy(false);
      showToast('error', t('deleteAccount.error.title'), {
        subtitle: t('deleteAccount.error.body'),
        action: { label: t('deleteAccount.error.retry'), onPress: () => void remove() },
      });
    }
  };
  const confirm = () =>
    Alert.alert(t('deleteAccount.alert.title'), t('deleteAccount.alert.body'), [
      { text: t('deleteAccount.alert.cancel'), style: 'cancel' },
      {
        text: t('deleteAccount.alert.confirm'),
        style: 'destructive',
        onPress: () => void remove(),
      },
    ]);

  return (
    <View className="flex-1 bg-bg">
      <TopBar
        title={t('deleteAccount.title')}
        back={{ label: t('deleteAccount.back'), onPress: () => router.back() }}
      />
      <ScrollView contentContainerClassName="gap-16 p-16">
        <Text variant="body-medium">{t('deleteAccount.intro')}</Text>
        <View accessibilityRole="list" className="gap-12">
          {erased.map(({ key, icon }) => (
            <View key={key} accessible className="flex-row items-center gap-16">
              <View className="size-disc items-center justify-center rounded-pill bg-surface">
                <Icon {...uiIcon(icon)} size="icon-m" color="ink" />
              </View>
              <Text variant="body" className="flex-1">
                {t(`deleteAccount.${key}`)}
              </Text>
            </View>
          ))}
        </View>
        <View accessible className="flex-row gap-12 rounded-section bg-surface p-16">
          <Icon {...uiIcon('map')} size="icon-l" />
          <View className="flex-1 gap-4">
            <Text variant="item">{t('deleteAccount.keptTitle')}</Text>
            <Text variant="body-s" color="muted">
              {t('deleteAccount.keptBody')}
            </Text>
          </View>
        </View>
        {isSubscriber && (
          <View className="flex-row gap-12 rounded-section bg-surface p-16">
            <Icon {...uiIcon('premium')} size="icon-l" />
            <View className="flex-1 gap-8">
              <Text variant="body">
                {Platform.OS === 'ios'
                  ? t('deleteAccount.subscriptionIos')
                  : t('deleteAccount.subscriptionAndroid')}
              </Text>
              <TextLink
                label={t('deleteAccount.manageSubscription')}
                icon="external"
                color="blue-ink"
                onPress={openStoreSubscriptions}
              />
            </View>
          </View>
        )}
      </ScrollView>
      <View
        className="border-t border-line px-16 pt-12"
        // Safe area measured at runtime.
        style={{ paddingBottom: insets.bottom + spacing['space-12'] }}
      >
        <Button
          variant="premium"
          isFullWidth
          isDisabled={isBusy}
          label={t('deleteAccount.confirm')}
          onPress={confirm}
        />
      </View>
    </View>
  );
}
