import type { UiIconKey } from '@widoo/tokens';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StatusMessage } from '../components/StatusMessage';
import { Button } from '../ui/Button';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import type { Segment } from './lists';

const emptyIcons: Record<Segment, UiIconKey> = {
  upcoming: 'empty-upcoming',
  favorites: 'favorite',
  past: 'empty-past',
  created: 'add',
};

/**
 * The empty block of a segment (D-038, D-073): disc, title, text, and for « À venir » the blue
 * button to the discovery.
 */
export function EmptySegment({
  segment,
  onDiscover,
}: {
  segment: Segment;
  onDiscover: () => void;
}) {
  const { t } = useTranslation();
  return (
    <StatusMessage
      icon={emptyIcons[segment]}
      title={t(`routes.${segment}.empty.title`)}
      body={t(`routes.${segment}.empty.body`)}
      action={
        segment === 'upcoming' ? (
          <Button label={t('routes.upcoming.empty.discover')} onPress={onDiscover} />
        ) : undefined
      }
    />
  );
}

const benefits = [
  { key: 'plan', icon: 'plan-date' },
  { key: 'favorites', icon: 'favorite' },
  { key: 'past', icon: 'rating' },
] as const;

/** Without account (D-038): a full page invitation as the profile's, without segments. */
export function SignedOutRoutes({ onSignIn }: { onSignIn: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="gap-24 pt-24">
      <View className="items-center gap-8">
        <Text variant="title-l" accessibilityRole="header" className="text-center">
          {t('routes.signedOut.title')}
        </Text>
        <Text variant="body" color="muted" className="text-center">
          {t('routes.signedOut.free')}
        </Text>
      </View>
      <View className="gap-16">
        {benefits.map(({ key, icon }) => (
          <View key={key} accessible className="flex-row items-center gap-16">
            <View className="size-disc items-center justify-center rounded-pill bg-surface">
              <Icon {...uiIcon(icon)} size="icon-m" color="ink" />
            </View>
            <View className="flex-1 gap-4">
              <Text variant="item">{t(`routes.signedOut.${key}.title`)}</Text>
              <Text variant="body-s" color="muted">
                {t(`routes.signedOut.${key}.body`)}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <Button isFullWidth label={t('routes.signedOut.signIn')} onPress={onSignIn} />
    </View>
  );
}
