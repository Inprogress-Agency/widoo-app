import { colors, motion, size } from '@widoo/tokens';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, ActivityIndicator, Platform, Pressable, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';

// The link text is shorter than a finger: its hit slop brings it to 44 points.
const linkHitSlop = size['touch-min'] / 4;

/** White disc that brings the map back on the user, or on Paris without position (E-01). */
export function RecenterButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('map.recenter')}
      onPress={onPress}
      className="size-disc items-center justify-center rounded-pill bg-bg"
    >
      <Icon {...uiIcon('recenter')} />
    </Pressable>
  );
}

/** The pills come in with a fade, kept with « Réduire les animations » (D-030). */
const pillFade = FadeIn.duration(motion.durations.fade).reduceMotion(ReduceMotion.Never);

/**
 * White pill « Rechercher dans cette zone », after a move of the map: the search runs only when
 * it is pressed (Filtres-et-Recherche › Recherche par zone). Its label wraps at large text.
 */
export function SearchZoneButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Animated.View entering={pillFade}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('map.searchZone')}
        onPress={onPress}
        className="min-h-disc flex-row items-center gap-8 rounded-pill bg-bg px-16 py-10"
      >
        <Icon {...uiIcon('refresh')} color="blue" />
        <Text variant="body-medium" className="shrink">
          {t('map.searchZone')}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/** True once `isOn` has lasted `delayMs`: a short wait shows nothing (Mouvement, `shimmer`). */
function useIsLasting(isOn: boolean, delayMs: number): boolean {
  const [isLasting, setIsLasting] = useState(false);
  useEffect(() => {
    if (!isOn) {
      return;
    }
    const timer = setTimeout(() => setIsLasting(true), delayMs);
    return () => {
      clearTimeout(timer);
      setIsLasting(false);
    };
  }, [isOn, delayMs]);
  return isOn && isLasting;
}

/**
 * The pill of a search on its way, in place of the button: a ring and « Recherche… », after
 * 300 ms only, read out by screen readers.
 */
export function SearchingPill({ isSearching }: { isSearching: boolean }) {
  const { t } = useTranslation();
  const isShown = useIsLasting(isSearching, motion.durations.loadingDelay);
  const label = t('map.searching');

  useEffect(() => {
    if (isShown && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(label);
    }
  }, [isShown, label]);

  if (!isShown) {
    return null;
  }
  return (
    <Animated.View
      entering={pillFade}
      accessible
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      accessibilityState={{ busy: true }}
      className="min-h-disc flex-row items-center gap-8 rounded-pill bg-bg px-16 py-10"
    >
      <ActivityIndicator color={colors.blue} />
      <Text variant="body-medium" color="muted" className="shrink">
        {label}
      </Text>
    </Animated.View>
  );
}

/**
 * Discreet line when the position is off: the map shows Paris, « Activer » asks again, or opens
 * the settings once the system no longer asks (Ecrans › E-01, géolocalisation refusée).
 */
export function LocationOffBanner({ onEnable }: { onEnable: () => void }) {
  const { t } = useTranslation();
  return (
    <View
      accessibilityLiveRegion="polite"
      className="min-h-touch-min flex-row items-center gap-8 rounded-block bg-surface px-12 py-8"
    >
      <Icon {...uiIcon('location-off')} size="space-16" color="muted" />
      <Text variant="label" color="muted" className="flex-1">
        {t('map.locationOff')}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('map.enableLocation')}
        hitSlop={linkHitSlop}
        onPress={onEnable}
      >
        <Text variant="label-strong" color="blue-ink">
          {t('map.enable')}
        </Text>
      </Pressable>
    </View>
  );
}
