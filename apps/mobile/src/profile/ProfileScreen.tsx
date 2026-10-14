import { spacing } from '@widoo/tokens';
import { router, useFocusEffect } from 'expo-router';
import { BottomTabBarHeightContext } from 'expo-router/tabs';
import { use, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analytics } from '../analytics';
import { routeOpenedEvent } from '../analytics/discovery';
import { signInFlow } from '../auth/signIn';
import { StatusMessage } from '../components/StatusMessage';
import { routeHref } from '../results/navigation';
import { Button } from '../ui/Button';
import { DiscButton } from '../ui/DiscButton';
import { StatusLine } from '../ui/StatusLine';
import { Text } from '../ui/Text';
import { CertificationSheet, type CertificationSheetMethods } from './CertificationSheet';
import { useMe } from './me';
import { PremiumCard } from './PremiumCard';
import { figuresOfMe, ProfileHeader, ProfileStats } from './ProfileHeader';
import {
  Anecdotes,
  BecomeCertified,
  CompleteProfile,
  FeaturedRoutes,
  SignedOutProfile,
} from './ProfileSections';
import { certificationGap, completionOf } from './progress';

/**
 * E-09, my profile as the others see it (D-023), with « Modifier le profil » and the gear to the
 * settings; without account, what the account brings and the way to E-10. Offline, the last
 * profile kept on the phone with its status line (D-025).
 */
export function ProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = use(BottomTabBarHeightContext) ?? 0;
  const { state, refetch } = useMe();
  const certificationSheet = useRef<CertificationSheetMethods>(null);
  // Back on the tab, the profile asks again: a first name chosen at sign-in, a badge obtained.
  useFocusEffect(useCallback(() => refetch(), [refetch]));

  const me = state.status === 'ready' ? state.me : null;
  const openEdit = () => router.push('/edit-profile');
  const openSettings = () => router.push('/profile/settings');
  const openCertification = () => {
    if (me) {
      analytics.track('certified_info_opened', { creator_id: me.id, own: true });
      certificationSheet.current?.open();
    }
  };
  const openRoute = (id: string) => {
    analytics.track('route_opened', routeOpenedEvent({ id }, 'card'));
    router.push(routeHref({ id }));
  };

  return (
    // Safe area measured at runtime.
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <ScrollView
        contentContainerClassName="gap-24 p-16"
        // Tab bar height measured at runtime.
        contentContainerStyle={{ paddingBottom: spacing['space-32'] + tabBarHeight }}
      >
        <View className="flex-row items-center justify-between gap-12">
          {state.status === 'anonymous' ? (
            <View />
          ) : (
            <Text variant="title-xl" accessibilityRole="header">
              {t('profile.title')}
            </Text>
          )}
          <DiscButton
            icon="settings"
            surface="surface"
            accessibilityLabel={t('profile.settings')}
            onPress={openSettings}
          />
        </View>
        {state.status === 'anonymous' && (
          <SignedOutProfile
            onSignIn={() => void signInFlow.requireAccount('profile', () => undefined)}
          />
        )}
        {state.status === 'loading' && <StatusMessage title={t('profile.title')} isBusy />}
        {state.status === 'error' && (
          <StatusMessage
            icon="error"
            title={t('profile.error.title')}
            body={t('profile.error.body')}
            action={<Button label={t('profile.error.retry')} onPress={refetch} />}
          />
        )}
        {me && state.status === 'ready' && (
          <>
            {state.isOffline && <StatusLine icon="wifi-slash" text={t('profile.offline')} />}
            {!me.isPublic && (
              <StatusLine
                icon="eye-slash"
                text={t('profile.masked')}
                action={{
                  label: t('profile.maskedEdit'),
                  accessibilityLabel: t('profile.maskedEditSpoken'),
                  onPress: openSettings,
                }}
              />
            )}
            <ProfileHeader
              identity={me}
              isCertified={me.certification.isCertified}
              onCertifiedPress={openCertification}
              onEditPress={openEdit}
            />
            {!me.certification.isCertified && (
              <BecomeCertified
                gap={certificationGap(me.certification)}
                onPress={openCertification}
              />
            )}
            <CompleteProfile steps={completionOf(me)} onOpen={openEdit} />
            <ProfileStats figures={figuresOfMe(me)} />
            <FeaturedRoutes routes={me.featuredRoutes} onOpen={openRoute} />
            <Anecdotes anecdotes={me.anecdotes} />
            {me.plan !== 'premium' && <PremiumCard />}
          </>
        )}
      </ScrollView>
      {/* Out of the scroll view, whose touches would hold the taps on the veil. */}
      {me && <CertificationSheet ref={certificationSheet} certification={me.certification} />}
    </View>
  );
}
