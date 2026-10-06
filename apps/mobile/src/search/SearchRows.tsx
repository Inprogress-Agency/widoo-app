import { labels, type GeocodeZone, type RouteCard } from '@widoo/shared';
import { size, type UiIconKey } from '@widoo/tokens';
import { Image } from 'expo-image';
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View } from 'react-native';
import { formatRating } from '../format/rating';
import { Icon, uiIcon } from '../ui/Icon';
import { MoodDot } from '../ui/MoodDot';
import { Rating } from '../ui/Rating';
import { Text } from '../ui/Text';
import { highlightParts } from './highlight';
import type { RecentZone } from './recentZones';

// A link text is shorter than a finger: its hit slop brings it to 44 points.
const linkHitSlop = size['touch-min'] / 4;

/** The name, the part typed in bold (Ecrans › E-02, saisie). */
function Name({ name, typed }: { name: string; typed: string }) {
  return (
    <Text variant="body-medium">
      {highlightParts(name, typed).map((part, index) =>
        part.isMatch ? (
          <Text key={index} variant="button">
            {part.text}
          </Text>
        ) : (
          part.text
        ),
      )}
    </Text>
  );
}

/** Icon in a warm grey disc of 44 points, at the head of a row. */
function Disc({ icon }: { icon: UiIconKey }) {
  return (
    <View className="size-disc items-center justify-center rounded-pill bg-surface">
      <Icon {...uiIcon(icon)} />
    </View>
  );
}

interface RowProps {
  head: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  accessibilityLabel: string;
  onPress: () => void;
  /** At the end of the row, apart from it, such as the cross of a recent zone. */
  end?: ReactNode;
}

/** A row of the search: one element for screen readers, titles and subtitles wrap, never cut. */
function Row({ head, title, subtitle, accessibilityLabel, onPress, end }: RowProps) {
  return (
    <View className="flex-row items-center gap-8">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        className="min-h-touch-min flex-1 flex-row items-center gap-12 py-8"
      >
        {head}
        <View className="flex-1 gap-4">
          {title}
          {subtitle}
        </View>
      </Pressable>
      {end}
    </View>
  );
}

/** « Quartier · Paris 10e », and the number of routes when known. */
function zoneDetails(
  t: ReturnType<typeof useTranslation>['t'],
  zone: Pick<GeocodeZone, 'kind' | 'area'>,
  routeCount?: number,
): string[] {
  return [
    t(`search.kind.${zone.kind}`),
    zone.area,
    routeCount === undefined ? null : t('sheet.count', { count: routeCount }),
  ].filter((part): part is string => Boolean(part));
}

/** A zone found: « Canal Saint-Martin, Quartier, Paris 10e, 18 parcours ». */
export function ZoneRow({
  zone,
  typed,
  onPress,
}: {
  zone: GeocodeZone;
  typed: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const details = zoneDetails(t, zone, zone.routeCount);
  return (
    <Row
      head={<Disc icon="map" />}
      title={<Name name={zone.name} typed={typed} />}
      subtitle={
        <Text variant="body-s" color="muted">
          {details.join(t('map.tooltip.separator'))}
        </Text>
      }
      accessibilityLabel={[zone.name, ...details].join(', ')}
      onPress={onPress}
    />
  );
}

/** A recent zone, with its cross to remove it (Ecrans › E-02, champ vide). */
export function RecentZoneRow({
  zone,
  onPress,
  onRemove,
}: {
  zone: RecentZone;
  onPress: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const details = zoneDetails(t, zone);
  return (
    <Row
      head={<Disc icon="duration" />}
      title={<Text variant="body-medium">{zone.name}</Text>}
      subtitle={
        <Text variant="body-s" color="muted">
          {details.join(t('map.tooltip.separator'))}
        </Text>
      }
      accessibilityLabel={[zone.name, ...details].join(', ')}
      onPress={onPress}
      end={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('search.removeRecent', { zone: zone.name })}
          onPress={onRemove}
          className="size-touch-min items-center justify-center"
        >
          <Icon {...uiIcon('remove')} color="muted" />
        </Pressable>
      }
    />
  );
}

/** « Autour de moi »: back to the zone around the user. */
export function AroundMeRow({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Row
      head={<Disc icon="recenter" />}
      title={<Text variant="body-medium">{t('search.aroundMe')}</Text>}
      accessibilityLabel={t('search.aroundMe')}
      onPress={onPress}
    />
  );
}

/** A route whose title holds the text: « Parcours …, Nature, République, note 4,8 sur 5 ». */
export function RouteRow({
  route,
  typed,
  onPress,
}: {
  route: RouteCard;
  typed: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const mood = route.moods[0];
  const place = [mood && labels.fr.moods[mood], route.district, route.neighborhood].filter(
    (part): part is string => Boolean(part),
  );
  const { average } = route.rating;
  const rating =
    average === null || route.rating.count === 0
      ? t('badges.new')
      : t('search.routeRating', { value: formatRating(average) });
  return (
    <Row
      head={
        <View className="size-disc items-center justify-center overflow-hidden rounded-thumb bg-skeleton">
          {route.coverUrl ? (
            <Image
              source={{ uri: route.coverUrl }}
              contentFit="cover"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <Icon {...uiIcon('map')} color="muted" />
          )}
        </View>
      }
      title={<Name name={route.title} typed={typed} />}
      // The mood dot stays first; the details wrap as one block (Ecrans › E-02, texte agrandi).
      subtitle={
        <View className="flex-row items-start gap-6">
          {mood && (
            <View className="min-h-20 justify-center">
              <MoodDot mood={mood} />
            </View>
          )}
          <View className="flex-1 flex-row flex-wrap items-center gap-x-6">
            {place.length > 0 && (
              <Text variant="body-s" color="muted">
                {place.join(t('map.tooltip.separator'))}
              </Text>
            )}
            <Rating rating={route.rating} />
          </View>
        </View>
      }
      accessibilityLabel={[t('search.routeLabel', { title: route.title }), ...place, rating].join(
        ', ',
      )}
      onPress={onPress}
    />
  );
}

/** Title of a group, read as a heading, with a link on its right (« Tout effacer »). */
export function GroupHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; accessibilityLabel?: string; onPress: () => void };
}) {
  return (
    <View className="flex-row flex-wrap items-center justify-between gap-x-12 pb-4 pt-16">
      <Text variant="label-strong" color="muted" accessibilityRole="header" className="uppercase">
        {title}
      </Text>
      {action && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          hitSlop={linkHitSlop}
          onPress={action.onPress}
        >
          <Text variant="label-strong" color="blue">
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * A discreet state line (Ecrans › E-02, états): 16-point icon and grey text, a blue link on its
 * right, no background; read out when it appears.
 */
export function StatusLine({
  icon,
  text,
  action,
}: {
  icon: UiIconKey;
  text: string;
  action?: { label: string; accessibilityLabel: string; onPress: () => void };
}) {
  useEffect(() => {
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(text);
    }
  }, [text]);
  return (
    <View className="flex-row items-center gap-8">
      <View
        accessible
        accessibilityLabel={text}
        accessibilityLiveRegion="polite"
        className="min-h-touch-min flex-1 flex-row items-center gap-8"
      >
        <Icon {...uiIcon(icon)} size="icon-s" color="muted" />
        <Text variant="label" color="muted" className="flex-1">
          {text}
        </Text>
      </View>
      {action && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel}
          onPress={action.onPress}
          className="min-h-touch-min justify-center"
        >
          <Text variant="label-strong" color="blue">
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
