import { useMutation } from '@tanstack/react-query';
import {
  ReplyEmail,
  SupportTopic,
  supportMessageMaxLength,
  supportTopics,
  type SupportMessageInput,
} from '@widoo/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useStore } from 'zustand';
import { api } from '../api/client';
import { useIsOnline } from '../discovery/useRouteSearch';
import { useMe } from '../profile/me';
import { appVersion } from '../profile/store';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Text } from '../ui/Text';
import { TextField } from '../ui/TextField';
import { showToast } from '../ui/toastStore';
import { clearContactDraft, contactDraft, deviceDescription } from './contactDraft';
import { SettingsPage } from './SettingsPage';

/**
 * Nous écrire (Ecrans › E-19, D-063): a subject, the message, the address to answer to (the
 * account's, Apple's relay included; empty and required without account), the version of the app
 * and the phone joined. Sent: back on Aide et contact with a toast. A failure or no network keeps
 * the message on the page.
 */
export function ContactScreen() {
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{ topic?: string }>();
  const { state } = useMe();
  const isOnline = useIsOnline();
  const draft = useStore(contactDraft);
  const [isEmailChecked, setIsEmailChecked] = useState(false);
  // « Nous écrire sur vos données » opens the form on the subject « Données ».
  useEffect(() => {
    const asked = SupportTopic.safeParse(params.topic);
    if (asked.success) {
      contactDraft.setState({ topic: asked.data });
    }
  }, [params.topic]);
  const { topic } = draft;
  const accountEmail = state.status === 'ready' ? (state.me.email ?? '') : '';
  const replyEmail = draft.replyEmail ?? accountEmail;
  const isEmailValid = ReplyEmail.safeParse(replyEmail).success;

  const send = useMutation({
    mutationFn: (message: SupportMessageInput) => api.sendSupportMessage(message),
    networkMode: 'always',
    onSuccess: () => {
      clearContactDraft();
      router.back();
      showToast('success', t('contact.sent'), { subtitle: t('contact.sentBody') });
    },
    onError: () =>
      showToast('error', t('contact.error'), {
        subtitle: t('contact.errorBody'),
        action: { label: t('contact.retry'), onPress: submit },
      }),
  });

  function submit() {
    setIsEmailChecked(true);
    if (!isEmailValid) {
      return;
    }
    send.mutate({
      topic,
      message: draft.message.trim(),
      replyEmail: replyEmail.trim(),
      appVersion: appVersion().version,
      device: deviceDescription(),
      locale: i18n.language === 'en' ? 'en' : 'fr',
    });
  }

  const canSend =
    isOnline && draft.message.trim() !== '' && replyEmail.trim() !== '' && !send.isPending;
  return (
    <SettingsPage title={t('contact.title')} backLabel={t('contact.back')}>
      <View className="gap-8">
        <Text variant="label-strong" accessibilityRole="header">
          {t('contact.topic')}
        </Text>
        <View className="flex-row flex-wrap gap-8">
          {supportTopics.map((value) => (
            <Chip
              key={value}
              label={t(`contact.topics.${value}`)}
              isActive={topic === value}
              surface="surface"
              onPress={() => contactDraft.setState({ topic: value })}
            />
          ))}
        </View>
      </View>
      <TextField
        label={t('contact.message')}
        value={draft.message}
        onChangeText={(message) => contactDraft.setState({ message })}
        maxLength={supportMessageMaxLength}
        isMultiline
      />
      <TextField
        label={t('contact.replyEmail')}
        value={replyEmail}
        onChangeText={(value) => contactDraft.setState({ replyEmail: value })}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        error={isEmailChecked && !isEmailValid ? t('contact.emailInvalid') : undefined}
      />
      <Text variant="body-s" color="muted">
        {t('contact.joined')}
      </Text>
      {!isOnline && (
        <Text variant="body-s" color="muted">
          {t('contact.offline')}
        </Text>
      )}
      <Button label={t('contact.send')} isFullWidth isDisabled={!canSend} onPress={submit} />
    </SettingsPage>
  );
}
