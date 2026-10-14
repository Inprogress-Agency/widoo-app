import type { Me } from '@widoo/shared';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatRating } from '../format/rating';
import { Button } from '../ui/Button';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { memberSince } from './progress';

/** Side of the photo of the header, as the maquettes draw it (Ecrans › E-09, planche 1). */
const PHOTO_SIZE = 96;

interface ProfileHeaderProps {
  me: Me;
  onCertifiedPress: () => void;
  onEditPress: () => void;
}

/**
 * The centred header of my profile (Ecrans › E-09): photo or initial, first name with the blue
 * seal, « Créateur certifié » that opens its sheet, place and seniority, bio, « Modifier le
 * profil ». The identity is one element for screen readers; the badge link and the button apart.
 */
export function ProfileHeader({ me, onCertifiedPress, onEditPress }: ProfileHeaderProps) {
  const { t } = useTranslation();
  const name = me.firstName ?? '';
  const isCertified = me.certification.isCertified;
  const date = memberSince(me.createdAt);
  const seniority = me.neighborhood
    ? t('profile.placeAndSince', { place: me.neighborhood, date })
    : t('profile.memberSince', { date });
  const identity = [name, isCertified ? t('profile.certified') : null, seniority]
    .filter(Boolean)
    .join(', ');

  return (
    <View className="items-center gap-12">
      <View accessible accessibilityLabel={identity} className="items-center gap-8">
        <View
          className="items-center justify-center overflow-hidden rounded-pill bg-blue-soft"
          style={{ width: PHOTO_SIZE, height: PHOTO_SIZE }}
        >
          <Text variant="title-xl" color="blue-ink">
            {name.charAt(0).toUpperCase()}
          </Text>
          {me.avatarUrl && (
            <Image
              source={{ uri: me.avatarUrl }}
              contentFit="cover"
              style={StyleSheet.absoluteFill}
            />
          )}
        </View>
        <View className="flex-row flex-wrap items-center justify-center gap-6">
          <Text variant="title-xl" className="text-center">
            {name}
          </Text>
          {isCertified && <Icon {...uiIcon('certified')} size="icon-l" />}
        </View>
      </View>
      {isCertified && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profile.certifiedMore')}
          onPress={onCertifiedPress}
          className="min-h-touch-min flex-row items-center gap-6"
        >
          <Text variant="button" color="blue-ink">
            {t('profile.certified')}
          </Text>
          <Icon {...uiIcon('info')} size="icon-s" color="blue-ink" />
        </Pressable>
      )}
      {/* Read in the identity above. */}
      <Text
        variant="body-s"
        color="muted"
        accessibilityElementsHidden
        importantForAccessibility="no"
        className="text-center"
      >
        {seniority}
      </Text>
      {me.bio && (
        <Text variant="body" className="text-center">
          {me.bio}
        </Text>
      )}
      <Button variant="secondary" icon="edit" label={t('profile.edit')} onPress={onEditPress} />
    </View>
  );
}

/**
 * The figures, in text and not touchable: each only when it exists (no « 0 », no rating without
 * reviews); the row goes when there is none. Read as a list.
 */
export function ProfileStats({ me }: { me: Me }) {
  const { t } = useTranslation();
  const valueOf = (key: 'completedRoutes' | 'averageRating') =>
    me.certification.criteria.find((criterion) => criterion.criterion === key)?.value ?? null;
  const completed = valueOf('completedRoutes');
  const rating = valueOf('averageRating');
  const stats = [
    ...(completed !== null && completed > 0
      ? [
          {
            key: 'completed',
            value: String(completed),
            label: t('profile.stats.completed', { count: completed }),
            spoken: `${completed} ${t('profile.stats.completed', { count: completed })}`,
            hasStar: false,
          },
        ]
      : []),
    ...(rating !== null
      ? [
          {
            key: 'rating',
            value: formatRating(rating),
            label: t('profile.stats.rating'),
            spoken: t('profile.stats.ratingSpoken', { value: formatRating(rating) }),
            hasStar: true,
          },
        ]
      : []),
  ];
  if (stats.length === 0) {
    return null;
  }
  return (
    <View
      accessibilityRole="list"
      accessibilityLabel={t('profile.stats.label')}
      className="flex-row"
    >
      {stats.map((stat, index) => (
        <View
          key={stat.key}
          accessible
          accessibilityLabel={stat.spoken}
          className={`flex-1 items-center gap-4 px-8 ${index > 0 ? 'border-l border-line' : ''}`}
        >
          <View className="flex-row items-center gap-4">
            {stat.hasStar && <Icon {...uiIcon('rating')} size="icon-m" />}
            <Text variant="number-l">{stat.value}</Text>
          </View>
          <Text variant="body-s" color="muted" className="text-center">
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
