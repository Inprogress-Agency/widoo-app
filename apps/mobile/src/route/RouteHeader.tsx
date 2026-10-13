import type { RouteCard } from '@widoo/shared';
import type { ColorToken, UiIconKey } from '@widoo/tokens';
import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  View,
  findNodeHandle,
  type Text as NativeText,
} from 'react-native';
import { formatRating } from '../format/rating';
import { creatorText, placeText } from '../results/cardText';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Icon, uiIcon } from '../ui/Icon';
import { InfoTile } from '../ui/InfoTile';
import { MoodDot } from '../ui/MoodDot';
import { Text } from '../ui/Text';
import { TextLink } from '../ui/TextLink';
import { tilesText } from './sheetText';

/** What the top of the sheet reads: the card of the list holds it all (Ecrans › E-05, chargement). */
export type HeaderRoute = Pick<
  RouteCard,
  | 'title'
  | 'moods'
  | 'district'
  | 'neighborhood'
  | 'rating'
  | 'isOfficial'
  | 'author'
  | 'durationMin'
  | 'budgetPerPersonEur'
  | 'distanceM'
  | 'stepCount'
>;

interface RouteHeaderProps {
  route: HeaderRoute;
  /** Certified creator: the blue seal after the first name (D-023). */
  isCertified: boolean;
  /** A private route opened by its link: « Partagé par Camille… ». */
  sharedBy: string | null;
  /** « 128 avis »: down to the reviews. */
  onReviews?: () => void;
}

/**
 * Title (26 points, focused at the opening), mood and place, rating and creator, the line of a
 * private route, and the four key figures. What the card already knows: shown at once.
 */
export function RouteHeader({ route, isCertified, sharedBy, onReviews }: RouteHeaderProps) {
  const { t } = useTranslation();
  const title = useRef<NativeText>(null);
  const mood = route.moods[0];
  const place = placeText(route);
  const creator = creatorText(t, route);
  const { average, count } = route.rating;

  useEffect(() => {
    // The title takes the focus once the sheet has risen, so that it is what is read first.
    const timer = setTimeout(() => {
      const node = findNodeHandle(title.current);
      if (node) {
        AccessibilityInfo.setAccessibilityFocus(node);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="gap-12">
      <View className="gap-8">
        <Text ref={title} variant="title-xl" accessibilityRole="header">
          {route.title}
        </Text>
        {place !== '' && (
          <View className="flex-row items-center gap-8">
            {mood && <MoodDot mood={mood} />}
            <Text variant="body-medium" color="muted" className="shrink">
              {place}
            </Text>
          </View>
        )}
        <View className="flex-row flex-wrap items-center gap-12">
          {average === null || count === 0 ? (
            <View>
              <Badge kind="new" />
            </View>
          ) : (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={t('route.ratingLabel', { value: formatRating(average), count })}
              onPress={onReviews}
              className="flex-row items-center gap-6"
            >
              <Icon {...uiIcon('rating')} size="icon-m" />
              <Text variant="number-m">{formatRating(average)}</Text>
              <Text variant="body-medium" color="muted" className="underline">
                {t('route.reviewsLink', { count })}
              </Text>
            </Pressable>
          )}
          <View
            accessible
            accessibilityLabel={isCertified ? `${creator}, ${t('badges.certified')}` : creator}
            className="shrink flex-row items-center gap-8"
          >
            <Avatar
              url={route.author?.avatarUrl ?? null}
              name={route.author?.firstName ?? 'Widoo'}
              isWidoo={route.isOfficial}
              size="avatar-s"
            />
            <Text variant="body-medium" color="muted" className="shrink">
              {creator}
            </Text>
            {isCertified && <Icon {...uiIcon('certified')} size="icon-s" />}
          </View>
        </View>
        {sharedBy && (
          <IconLine icon="private" color="muted">
            {t('route.sharedBy', { name: sharedBy })}
          </IconLine>
        )}
      </View>
      <View
        accessibilityRole="list"
        accessibilityLabel={t('route.tiles.label')}
        className="flex-row flex-wrap gap-6"
      >
        {tilesText(t, route).map((tile) => (
          <InfoTile
            key={tile.key}
            icon={tile.icon}
            value={tile.value}
            label={tile.label}
            accessibilityLabel={tile.spoken}
          />
        ))}
      </View>
    </View>
  );
}

/** A discreet line with its icon: private route, reported place, error. */
export function IconLine({
  icon,
  color,
  children,
  action,
  isStatus = false,
}: {
  icon: UiIconKey;
  color: ColorToken;
  children: string;
  action?: ReactNode;
  /** A state of the sheet, announced when it appears. */
  isStatus?: boolean;
}) {
  useEffect(() => {
    if (isStatus && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(children);
    }
  }, [children, isStatus]);
  return (
    <View className="flex-row items-start gap-12">
      <View
        accessible
        accessibilityLabel={children}
        accessibilityLiveRegion={isStatus ? 'polite' : 'none'}
        className="flex-1 flex-row items-start gap-8"
      >
        <Icon {...uiIcon(icon)} size="icon-s" color={color} />
        <Text variant="status" color={color} className="shrink">
          {children}
        </Text>
      </View>
      {action}
    </View>
  );
}

export function RetryLink({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <TextLink
      label={t('route.retry')}
      accessibilityLabel={t('route.retryLabel')}
      role="button"
      onPress={onPress}
    />
  );
}
