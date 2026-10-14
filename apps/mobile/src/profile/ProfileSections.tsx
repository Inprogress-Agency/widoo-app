import type { FeaturedRoute, ProfileAnecdote } from '@widoo/shared';
import type { UiIconKey } from '@widoo/tokens';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { numberFormat } from '../i18n/formats';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import type { CertificationGap, CompletionStep } from './progress';

/** « À la une »: the chosen routes in their order, each opening its sheet; absent without any. */
export function FeaturedRoutes({
  routes,
  onOpen,
}: {
  routes: readonly FeaturedRoute[];
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation();
  if (routes.length === 0) {
    return null;
  }
  return (
    <View className="gap-12">
      <Text variant="title-m" accessibilityRole="header">
        {t('profile.featured')}
      </Text>
      {routes.map((route) => (
        <Card key={route.id} onPress={() => onOpen(route.id)} accessibilityLabel={route.title}>
          <View className="flex-row items-center gap-12 p-16">
            <Icon {...uiIcon('map')} size="icon-l" />
            <Text variant="title-card" className="flex-1">
              {route.title}
            </Text>
            <Icon {...uiIcon('open-row')} size="icon-m" color="muted" />
          </View>
        </Card>
      ))}
    </View>
  );
}

/** The anecdotes, each one element: the question small and grey, the answer large. */
export function Anecdotes({ anecdotes }: { anecdotes: readonly ProfileAnecdote[] }) {
  return (
    <View className="gap-12">
      {anecdotes.map((anecdote) => (
        <View
          key={anecdote.questionKey}
          accessible
          accessibilityLabel={`${anecdote.questionLabel}. ${anecdote.answer}`}
          className="gap-8 rounded-section bg-surface p-16"
        >
          <View className="flex-row items-center gap-6">
            <Icon {...uiIcon('anecdote')} size="icon-s" color="muted" />
            <Text variant="body-s" color="muted" className="flex-1">
              {anecdote.questionLabel}
            </Text>
          </View>
          <Text variant="title-m">{anecdote.answer}</Text>
        </View>
      ))}
    </View>
  );
}

const stepIcons: Record<CompletionStep, UiIconKey> = {
  photo: 'camera',
  bio: 'edit',
  anecdote: 'anecdote',
};

/**
 * « Complétez votre profil » of a new account: three steps, each opening Modifier le profil, a
 * step done reads « Fait »; the card goes once the three are done.
 */
export function CompleteProfile({
  steps,
  onOpen,
}: {
  steps: { step: CompletionStep; isDone: boolean }[];
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const done = steps.filter((step) => step.isDone).length;
  if (done === steps.length) {
    return null;
  }
  return (
    <View className="gap-12 rounded-section bg-surface p-16">
      <View className="flex-row flex-wrap items-center justify-between gap-x-12">
        <Text variant="title-m" accessibilityRole="header">
          {t('profile.complete.title')}
        </Text>
        <Text variant="label-strong" color="muted">
          {t('profile.complete.progress', { done, total: steps.length })}
        </Text>
      </View>
      <Text variant="body-s" color="muted">
        {t('profile.complete.body')}
      </Text>
      {steps.map(({ step, isDone }) => {
        const label = t(`profile.complete.${step}`);
        return (
          <Pressable
            key={step}
            accessibilityRole="button"
            accessibilityLabel={isDone ? `${label}, ${t('profile.complete.done')}` : label}
            onPress={onOpen}
            className="min-h-touch-min flex-row items-center gap-12"
          >
            <View className="size-disc items-center justify-center rounded-pill bg-bg">
              <Icon {...uiIcon(isDone ? 'done' : stepIcons[step])} size="icon-m" />
            </View>
            <Text variant="body-medium" className="flex-1">
              {label}
            </Text>
            {isDone ? (
              <Text variant="label-strong" color="green-ink">
                {t('profile.complete.done')}
              </Text>
            ) : (
              <Icon {...uiIcon('open-row')} size="icon-m" color="muted" />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** « Devenez créateur certifié », under the header of a creator not certified yet. */
export function BecomeCertified({
  gap,
  onPress,
}: {
  gap: CertificationGap | null;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  let line: string;
  if (gap === null) {
    line = t('profile.becomeCertified.almost');
  } else if (gap.kind === 'count') {
    line = t(`profile.becomeCertified.${gap.criterion}`, { count: gap.count });
  } else if (gap.kind === 'rating') {
    line = t('profile.becomeCertified.rating', {
      threshold: numberFormat().format(gap.threshold),
    });
  } else {
    line = t('profile.becomeCertified.several', { count: gap.count });
  }
  const title = t('profile.becomeCertified.title');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${line}`}
      onPress={onPress}
      className="flex-row items-center gap-12 rounded-block bg-blue-soft p-16"
    >
      <Icon {...uiIcon('certified')} size="icon-l" />
      <View className="flex-1 gap-4">
        <Text variant="item" color="blue-ink">
          {title}
        </Text>
        <Text variant="body-s">{line}</Text>
      </View>
      <Icon {...uiIcon('open-row')} size="icon-m" color="blue-ink" />
    </Pressable>
  );
}

const signedOutBenefits = [
  { key: 'favorites', icon: 'favorite' },
  { key: 'plan', icon: 'plan-date' },
  { key: 'create', icon: 'edit' },
] as const satisfies readonly { key: string; icon: UiIconKey }[];

/** The Profil tab without account (Ecrans › E-09, sans compte): what the account brings. */
export function SignedOutProfile({ onSignIn }: { onSignIn: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="gap-24 pt-24">
      <View className="items-center gap-8">
        <Text variant="title-xl" accessibilityRole="header" className="text-center">
          {t('profile.signedOut.title')}
        </Text>
        <Text variant="body" color="muted" className="text-center">
          {t('profile.signedOut.free')}
        </Text>
      </View>
      <View className="gap-16">
        {signedOutBenefits.map(({ key, icon }) => (
          <View key={key} accessible className="flex-row items-center gap-16">
            <View className="size-disc items-center justify-center rounded-pill bg-surface">
              <Icon {...uiIcon(icon)} size="icon-m" color="ink" />
            </View>
            <View className="flex-1 gap-4">
              <Text variant="item">{t(`profile.signedOut.${key}.title`)}</Text>
              <Text variant="body-s" color="muted">
                {t(`profile.signedOut.${key}.body`)}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <Button isFullWidth label={t('profile.signedOut.signIn')} onPress={onSignIn} />
    </View>
  );
}
