import { bioMaxLength, profileSlots, type Me } from '@widoo/shared';
import { spacing } from '@widoo/tokens';
import { router, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analytics } from '../analytics';
import { StatusMessage } from '../components/StatusMessage';
import { Text } from '../ui/Text';
import { TextField } from '../ui/TextField';
import { showToast } from '../ui/toastStore';
import { TopBar } from '../ui/TopBar';
import { AnecdoteSheet, type AnecdoteSheetMethods } from './AnecdoteSheet';
import {
  changesOf,
  draftErrors,
  draftOf,
  moveItem,
  profileUpdatedEvent,
  putAnecdote,
  type ProfileDraft,
} from './draft';
import { useAppConfig, useMe, useUpdateMe } from './me';
import { PremiumCard } from './PremiumCard';
import { AddTile, SectionTitle } from './FormParts';
import { ReorderRow } from './ReorderRow';

/**
 * « Modifier le profil » (Ecrans › E-09), pushed over the tabs (M-03): the page of the signed-in
 * account, or nothing to edit until it is read.
 */
export function EditProfileScreen() {
  const { t } = useTranslation();
  const { state } = useMe();
  if (state.status !== 'ready') {
    return (
      <View className="flex-1 bg-bg">
        <TopBar
          title={t('editProfile.title')}
          leading={{ label: t('editProfile.cancel'), onPress: () => router.back() }}
        />
        <StatusMessage title={t('editProfile.title')} isBusy={state.status === 'loading'} />
      </View>
    );
  }
  return <EditProfileForm me={state.me} />;
}

/**
 * The form: first name, bio of 150 characters with its counter, neighbourhood, anecdotes from
 * the questions of `/config` and featured routes, 3 of each at most, ordered by « Monter » and
 * « Descendre ». « Enregistrer » sends one `PATCH /me` and goes back with the toast « Profil
 * enregistré. »; a failure keeps the changes on screen with « Réessayer ». Leaving with changes,
 * by « Annuler » or the back gesture, asks first.
 */
function EditProfileForm({ me }: { me: Me }) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const config = useAppConfig();
  const update = useUpdateMe();
  const anecdoteSheet = useRef<AnecdoteSheetMethods>(null);
  const [draft, setDraft] = useState<ProfileDraft>(() => draftOf(me));
  const [shownErrors, setShownErrors] = useState<string[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const changes = changesOf(me, draft);
  const hasChanges = changes.update !== null && !isSaved;

  usePreventRemove(hasChanges, ({ data }) => {
    Alert.alert(t('editProfile.discard.title'), undefined, [
      { text: t('editProfile.discard.keep'), style: 'cancel' },
      {
        text: t('editProfile.discard.confirm'),
        style: 'destructive',
        onPress: () => navigation.dispatch(data.action),
      },
    ]);
  });

  const edit = (patch: Partial<ProfileDraft>) => setDraft((current) => ({ ...current, ...patch }));

  const save = () => {
    const errors = draftErrors(draft);
    setShownErrors(errors);
    if (errors.length > 0) {
      return;
    }
    const { update: body, fields } = changes;
    if (body === null) {
      router.back();
      return;
    }
    update.mutate(body, {
      onSuccess: () => {
        const event = profileUpdatedEvent(fields);
        if (event) {
          analytics.track('profile_updated', event);
        }
        setIsSaved(true);
        // The page leaves once the guard of the changes is down.
        setTimeout(() => router.back(), 0);
        showToast('success', t('profile.saved'), { isAboveTabBar: true });
      },
      onError: () =>
        showToast('error', t('editProfile.error.title'), {
          subtitle: t('editProfile.error.body'),
          action: { label: t('editProfile.error.retry'), onPress: save },
        }),
    });
  };

  const errorOf = (field: string, message: string) =>
    shownErrors.includes(field) ? message : undefined;
  const slots = (count: number) => t('editProfile.slots', { count, max: profileSlots });
  const questions = config.data?.anecdoteQuestions ?? [];

  return (
    <View className="flex-1 bg-bg">
      <TopBar
        title={t('editProfile.title')}
        leading={{ label: t('editProfile.cancel'), onPress: () => router.back() }}
        trailing={{
          label: t('editProfile.save'),
          accessibilityLabel: t('editProfile.saveSpoken'),
          onPress: save,
          isBusy: update.isPending,
        }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-24 p-16"
          // Safe area measured at runtime.
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing['space-32'] }}
        >
          <TextField
            label={t('editProfile.firstName')}
            value={draft.firstName}
            onChangeText={(firstName) => edit({ firstName })}
            autoComplete="given-name"
            textContentType="givenName"
            error={errorOf('firstName', t('editProfile.firstNameError'))}
          />
          <TextField
            label={t('editProfile.bio')}
            help={t('editProfile.bioHelp')}
            value={draft.bio}
            onChangeText={(bio) => edit({ bio })}
            maxLength={bioMaxLength}
            isMultiline
            autoCapitalize="sentences"
            error={errorOf('bio', t('editProfile.bioError'))}
          />
          <TextField
            label={t('editProfile.neighborhood')}
            help={t('editProfile.neighborhoodHelp')}
            value={draft.neighborhood}
            onChangeText={(neighborhood) => edit({ neighborhood })}
            error={errorOf('neighborhood', t('editProfile.neighborhoodError'))}
          />
          <View className="gap-12">
            <SectionTitle
              title={t('editProfile.anecdotes')}
              value={slots(draft.anecdotes.length)}
            />
            {draft.anecdotes.map((anecdote, index) => (
              <ReorderRow
                key={anecdote.questionKey}
                label={`${anecdote.questionLabel}, ${anecdote.answer}`}
                name={anecdote.questionLabel}
                index={index}
                total={draft.anecdotes.length}
                onMove={(from, offset) =>
                  edit({ anecdotes: moveItem(draft.anecdotes, from, offset) })
                }
                onPress={() => anecdoteSheet.current?.open(index, anecdote)}
              >
                <Text variant="body-s" color="muted">
                  {anecdote.questionLabel}
                </Text>
                <Text variant="item">{anecdote.answer}</Text>
              </ReorderRow>
            ))}
            {draft.anecdotes.length < profileSlots && (
              <AddTile
                label={t('editProfile.addAnecdote')}
                help={t('editProfile.addAnecdoteHelp')}
                onPress={() => anecdoteSheet.current?.open(null)}
              />
            )}
          </View>
          {draft.featured.length > 0 && (
            <View className="gap-12">
              <SectionTitle
                title={t('editProfile.featured')}
                value={slots(draft.featured.length)}
              />
              <Text variant="body-s" color="muted">
                {t('editProfile.featuredHelp')}
              </Text>
              {draft.featured.map((route, index) => (
                <ReorderRow
                  key={route.id}
                  label={route.title}
                  name={route.title}
                  index={index}
                  total={draft.featured.length}
                  onMove={(from, offset) =>
                    edit({ featured: moveItem(draft.featured, from, offset) })
                  }
                  onRemove={() =>
                    edit({ featured: draft.featured.filter((item) => item.id !== route.id) })
                  }
                >
                  <Text variant="item">{route.title}</Text>
                </ReorderRow>
              ))}
            </View>
          )}
          {me.plan !== 'premium' && <PremiumCard />}
        </ScrollView>
      </KeyboardAvoidingView>
      <AnecdoteSheet
        ref={anecdoteSheet}
        questions={questions}
        usedKeys={draft.anecdotes.map((anecdote) => anecdote.questionKey)}
        onSave={(anecdote, index) =>
          edit({ anecdotes: putAnecdote(draft.anecdotes, anecdote, index) })
        }
        onDelete={(index) =>
          edit({ anecdotes: draft.anecdotes.filter((_anecdote, position) => position !== index) })
        }
      />
    </View>
  );
}
