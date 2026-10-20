import type { Photo } from '@widoo/shared';
import { motion, radius, size, spacing } from '@widoo/tokens';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  StyleSheet,
  View,
  useWindowDimensions,
  type AccessibilityActionEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';
import { Badge } from '../ui/Badge';
import { Icon, uiIcon } from '../ui/Icon';
import { PhotoCounter } from '../ui/PhotoCounter';
import { PhotoCredit } from '../ui/PhotoCredit';

/** What the photo shows on it, as on the card (Ecrans › E-05, haut). */
export interface HeroBadges {
  isVerified: boolean;
  isOfficial: boolean;
  isPremium: boolean;
  /** A private route: « Privé » in place of Vérifié and Signature. */
  isPrivate: boolean;
}

interface RouteHeroProps {
  /** The cover first; a free photo carries its credit (D-052). */
  photos: readonly Photo[];
  badges: HeroBadges;
  /** Offset of the sheet: the photo goes at half its speed (M-10). */
  scrollY: SharedValue<number>;
}

/**
 * Photo of the sheet over 380 points (`hero-h`), a carousel swiped sideways with its counter and
 * the credit of a free photo at its left, Vérifié, Signature and Premium on it, or Privé. Read as one adjustable element, « Photo 1 sur
 * 6 »: swiping up or down changes the photo. With « Réduire les animations », no parallax.
 */
export function RouteHero({ photos, badges, scrollY }: RouteHeroProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isReducedMotion = useReducedMotion();
  const list = useRef<FlatList<Photo>>(null);
  const [index, setIndex] = useState(0);
  const count = photos.length;
  const credit = photos[index]?.credit ?? null;

  const parallax = useAnimatedStyle(() => {
    const offset = scrollY.get();
    // Pulled down, the photo stays put; scrolled up, it goes at half the speed of the sheet.
    return {
      transform: [
        { translateY: isReducedMotion || offset <= 0 ? 0 : offset * motion.scroll.photoParallax },
      ],
    };
  });

  const show = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), count - 1);
    list.current?.scrollToIndex({ index: clamped, animated: !isReducedMotion });
    setIndex(clamped);
  };
  const handleAction = (event: AccessibilityActionEvent) => {
    show(index + (event.nativeEvent.actionName === 'increment' ? 1 : -1));
  };
  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  return (
    <View className="h-hero-h overflow-hidden bg-skeleton">
      <Animated.View style={[StyleSheet.absoluteFill, parallax]}>
        {count > 0 ? (
          <View
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={t('route.photos', { position: index + 1, count })}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={handleAction}
            style={StyleSheet.absoluteFill}
          >
            <FlatList
              ref={list}
              data={photos}
              keyExtractor={(photo, position) => `${position}:${photo.url}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScrollEnd}
              getItemLayout={(_, position) => ({
                length: width,
                offset: width * position,
                index: position,
              })}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item.url }}
                  contentFit="cover"
                  transition={motion.durations.fade}
                  style={{ width, height: size['hero-h'] }}
                />
              )}
            />
          </View>
        ) : (
          <View
            accessible
            accessibilityLabel={t('route.noPhoto')}
            className="flex-1 items-center justify-center"
          >
            <Icon {...uiIcon('map')} size="icon-l" color="muted" />
          </View>
        )}
      </Animated.View>
      {/* The badges sit above the rounded top of the sheet, which covers the photo's bottom. */}
      <View
        pointerEvents="box-none"
        className="absolute inset-x-16 flex-row items-end gap-6"
        style={styles.badges}
      >
        <View pointerEvents="none" className="flex-1 flex-row flex-wrap gap-6">
          {badges.isPrivate ? (
            <Badge kind="private" />
          ) : (
            <>
              {badges.isVerified && <Badge kind="verified" />}
              {badges.isOfficial && <Badge kind="signature" />}
            </>
          )}
          {badges.isPremium && <Badge kind="premium" />}
        </View>
        {credit && <PhotoCredit credit={credit} />}
        {count > 1 && <PhotoCounter index={index} count={count} />}
      </View>
    </View>
  );
}

/** How far the white sheet climbs over the photo, its rounded top (`radius-sheet`). */
export const SHEET_OVERLAP = radius['radius-sheet'];

const styles = StyleSheet.create({
  badges: { bottom: SHEET_OVERLAP + spacing['space-12'] },
});
