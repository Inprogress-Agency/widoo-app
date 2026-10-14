import { spacing } from '@widoo/tokens';
import { router } from 'expo-router';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analytics } from '../analytics';
import { StatusMessage } from '../components/StatusMessage';
import { CertificationSheet, type CertificationSheetMethods } from '../profile/CertificationSheet';
import { useMe } from '../profile/me';
import { ProfileHeader, ProfileStats, type ProfileIdentity } from '../profile/ProfileHeader';
import { Anecdotes } from '../profile/ProfileSections';
import { Button } from '../ui/Button';
import { DiscButton } from '../ui/DiscButton';
import { Skeleton } from '../ui/Skeleton';
import { usePublicProfile, type KnownCreator } from './usePublicProfile';

interface PublicProfileScreenProps {
  id: string;
  /** First name and photo given by the card or the sheet it was opened from. */
  known: KnownCreator | null;
  onBack: () => void;
}

/** The header of what is known while the profile loads or fails: photo and first name. */
const knownIdentity = (known: KnownCreator): ProfileIdentity => ({
  ...known,
  createdAt: null,
  neighborhood: null,
  bio: null,
});

/**
 * E-16, the public profile of a creator (D-023): the page of my profile (E-09) without « Modifier
 * le profil » nor its cards, pushed from « Par Camille » or « Voir le profil » (M-03). The first
 * name known by the card shows at once, the rest in grey bars (M-09); the error keeps it above a
 * centred block, a masked profile or a deleted account reads « Ce profil n'est pas disponible ».
 * Sharing waits for the public address of a profile (#427).
 */
export function PublicProfileScreen({ id, known, onBack }: PublicProfileScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { state, retry } = usePublicProfile(id, {}, known);
  const { state: meState } = useMe();
  const certificationSheet = useRef<CertificationSheetMethods>(null);
  const profile = state.status === 'ready' ? state.profile : null;

  const openCertification = () => {
    const isOwn = meState.status === 'ready' && meState.me.id === id;
    analytics.track('certified_info_opened', { creator_id: id, own: isOwn });
    certificationSheet.current?.open();
  };

  return (
    // Safe area measured at runtime.
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <View className="flex-row px-16 pb-8">
        <DiscButton
          icon="back"
          surface="surface"
          accessibilityLabel={t('creator.back')}
          onPress={onBack}
        />
      </View>
      <ScrollView
        contentContainerClassName="gap-24 px-16 pt-8"
        // Bottom safe area measured at runtime.
        contentContainerStyle={{ paddingBottom: spacing['space-32'] + insets.bottom }}
      >
        {(state.status === 'loading' || state.status === 'error') && state.known && (
          <ProfileHeader
            identity={knownIdentity(state.known)}
            isCertified={false}
            onCertifiedPress={() => undefined}
          />
        )}
        {state.status === 'loading' && (
          <View
            accessible
            accessibilityLabel={t('creator.loading')}
            accessibilityState={{ busy: true }}
            className="gap-16"
          >
            {/* Place, seniority and bio, then the figures and the routes. */}
            <Skeleton className="h-16 self-center rounded-pill" style={styles.shortLine} />
            <Skeleton className="h-16 self-center rounded-pill" style={styles.longLine} />
            <Skeleton className="h-20 rounded-pill" />
            <Skeleton className="h-card-h rounded-section" />
          </View>
        )}
        {state.status === 'error' && (
          <StatusMessage
            icon={state.isOffline ? 'offline' : 'error'}
            title={state.isOffline ? t('creator.offline.title') : t('profile.error.title')}
            body={state.isOffline ? t('creator.offline.body') : t('profile.error.body')}
            action={<Button label={t('profile.error.retry')} onPress={retry} />}
          />
        )}
        {state.status === 'unavailable' && (
          <StatusMessage
            icon="removed"
            title={t('creator.unavailable.title')}
            body={t('creator.unavailable.body')}
            action={
              <Button
                label={t('creator.unavailable.explore')}
                onPress={() => router.dismissTo('/')}
              />
            }
          />
        )}
        {profile && state.status === 'ready' && (
          <>
            <ProfileHeader
              identity={profile}
              isCertified={profile.certified}
              onCertifiedPress={openCertification}
            />
            <ProfileStats
              figures={{
                published: profile.routesPublished,
                completed: profile.routesCompleted,
                rating: profile.ratingAvg,
              }}
            />
            <Anecdotes anecdotes={profile.anecdotes} />
          </>
        )}
      </ScrollView>
      {/* Out of the scroll view, whose touches would hold the taps on the veils. */}
      {profile && (
        <CertificationSheet
          ref={certificationSheet}
          certification={{
            isCertified: profile.certified,
            certifiedAt: null,
            criteria: profile.certification.criteria,
          }}
          creatorName={profile.firstName}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shortLine: { width: '60%' },
  longLine: { width: '92%' },
});
