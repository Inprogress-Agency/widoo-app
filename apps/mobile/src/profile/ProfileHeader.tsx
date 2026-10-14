import type { Me } from '@widoo/shared';
import { size } from '@widoo/tokens';
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

/** What the header shows of a profile, mine (E-09) or a creator's (E-16). */
export interface ProfileIdentity {
  firstName: string | null;
  avatarUrl: string | null;
  /** Null while a public profile loads: only the photo and the first name are known. */
  createdAt: string | null;
  neighborhood: string | null;
  bio: string | null;
}

interface ProfileHeaderProps {
  identity: ProfileIdentity;
  isCertified: boolean;
  onCertifiedPress: () => void;
  /** « Modifier le profil », on my profile only. */
  onEditPress?: () => void;
}

// The seal is smaller than a finger: its hit slop brings it to 44 points.
const sealHitSlop = size['touch-min'] / 4;

/**
 * The centred header of a profile (Ecrans › E-09, E-16): photo or initial, first name with the
 * blue seal, « Créateur certifié » that opens its sheet, as the seal does, place and seniority,
 * bio, and on my profile « Modifier le profil ». The identity is one element for screen readers;
 * the badge link and the button apart.
 */
export function ProfileHeader({
  identity,
  isCertified,
  onCertifiedPress,
  onEditPress,
}: ProfileHeaderProps) {
  const { t } = useTranslation();
  const name = identity.firstName ?? '';
  const date = identity.createdAt ? memberSince(identity.createdAt) : null;
  let seniority: string | null = null;
  if (date) {
    seniority = identity.neighborhood
      ? t('profile.placeAndSince', { place: identity.neighborhood, date })
      : t('profile.memberSince', { date });
  }
  const spoken = [name, isCertified ? t('profile.certified') : null, seniority]
    .filter(Boolean)
    .join(', ');

  return (
    <View className="items-center gap-12">
      <View accessible accessibilityLabel={spoken} className="items-center gap-8">
        <View
          className="items-center justify-center overflow-hidden rounded-pill bg-blue-soft"
          style={{ width: PHOTO_SIZE, height: PHOTO_SIZE }}
        >
          <Text variant="title-xl" color="blue-ink">
            {name.charAt(0).toUpperCase()}
          </Text>
          {identity.avatarUrl && (
            <Image
              source={{ uri: identity.avatarUrl }}
              contentFit="cover"
              style={StyleSheet.absoluteFill}
            />
          )}
        </View>
        <View className="flex-row flex-wrap items-center justify-center gap-6">
          <Text variant="title-xl" className="text-center">
            {name}
          </Text>
          {isCertified && (
            // The link under it says the same to screen readers.
            <Pressable hitSlop={sealHitSlop} onPress={onCertifiedPress}>
              <Icon {...uiIcon('certified')} size="icon-l" />
            </Pressable>
          )}
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
      {seniority && (
        // Read in the identity above.
        <Text
          variant="body-s"
          color="muted"
          accessibilityElementsHidden
          importantForAccessibility="no"
          className="text-center"
        >
          {seniority}
        </Text>
      )}
      {identity.bio && (
        <Text variant="body" className="text-center">
          {identity.bio}
        </Text>
      )}
      {onEditPress && (
        <Button variant="secondary" icon="edit" label={t('profile.edit')} onPress={onEditPress} />
      )}
    </View>
  );
}

/** The figures of a profile, each null when it does not exist. */
export interface ProfileFigures {
  published: number | null;
  completed: number | null;
  rating: number | null;
}

/** My figures, from the criteria of my badge: published routes are not in `GET /me` (#421). */
export function figuresOfMe(me: Me): ProfileFigures {
  const valueOf = (key: 'completedRoutes' | 'averageRating') =>
    me.certification.criteria.find((criterion) => criterion.criterion === key)?.value ?? null;
  return {
    published: null,
    completed: valueOf('completedRoutes'),
    rating: valueOf('averageRating'),
  };
}

const counted = (value: number | null): value is number => value !== null && value > 0;

/**
 * The figures, in text and not touchable: each only when it exists (no « 0 », no rating without
 * reviews); the row goes when there is none. Read as a list.
 */
export function ProfileStats({ figures }: { figures: ProfileFigures }) {
  const { t } = useTranslation();
  const { published, completed, rating } = figures;
  const countStat = (key: 'published' | 'completed', value: number) => {
    const label = t(`profile.stats.${key}`, { count: value });
    return { key, value: String(value), label, spoken: `${value} ${label}`, hasStar: false };
  };
  const stats = [
    ...(counted(published) ? [countStat('published', published)] : []),
    ...(counted(completed) ? [countStat('completed', completed)] : []),
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
