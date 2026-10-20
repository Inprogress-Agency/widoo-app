import type { Photo, PlannedRoute, RouteDetail } from '@widoo/shared';
import { colors, immersive, motion } from '@widoo/tokens';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  interpolate,
  ReduceMotion,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, uiIcon } from '../ui/Icon';
import { PhotoCredit } from '../ui/PhotoCredit';
import { Text } from '../ui/Text';
import { GoCommands } from './GoCommands';
import { GoProgressBar } from './GoProgressBar';
import { TextVeil } from './TextVeil';
import { headerSpoken, lineText, progressText, statusText, stepName } from './goText';
import { distanceToCurrent, isArrivalSuggested, type GoProgress } from './progress';
import { useGoPosition } from './useGoPosition';

/**
 * `mappings.immersive.scrollDarken`, which tokens.json writes in words and the generated theme
 * does not carry: the photo darkened to 65 % of ink on the way to the content (D-034).
 */
const SCROLL_DARKEN = 0.65;
/** Side margin of the block, which its veil runs past to the edges. */
const BLOCK_PADDING = 20;

const fade = FadeIn.duration(motion.durations.fade).reduceMotion(ReduceMotion.Never);

interface GoPageProps {
  planned: PlannedRoute;
  progress: GoProgress;
  /** The full route, for the photos and « Pratique »; null until it answers, or offline. */
  route: RouteDetail | null;
  isOnline: boolean;
  /** Height the sheet « Le parcours » keeps at the bottom when half open. */
  sheetPeek: number;
  onCollapse: () => void;
  onDirections: () => void;
  onArrived: (isSuggested: boolean) => void;
  onNext: () => void;
  onFinish: () => void;
  /** The sections of the step, under the commands (Pratique, Le mot de…, Ensuite). */
  children?: ReactNode;
}

/** The photo of the step, from the full route: its place, else the cover of the route. */
function photoOf(route: RouteDetail | null, stepId: string | null): Photo | null {
  const step = route?.steps.find((candidate) => candidate.id === stepId);
  return (step && !step.isLocked ? step.place.photo : null) ?? route?.photos[0] ?? null;
}

/** A disc on the photo: ink at 40 % (`scrim`), white icon, 44 points. */
function PhotoDisc({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="size-disc items-center justify-center rounded-pill bg-scrim"
    >
      <Icon {...uiIcon('go-minimize')} size="icon-m" color="on-strong" />
    </Pressable>
  );
}

/**
 * E-07, the route under way: the only dark page of the app, like the « Now playing » screen of a
 * music app. The photo of the step full frame under its veils, the status and the name of the
 * step, the progress, the commands of the moment; the content of the step below, the sheet « Le
 * parcours » over it. The block grows upwards over the photo with the text (D-034).
 */
export function GoPage({
  planned,
  progress,
  route,
  isOnline,
  sheetPeek,
  onCollapse,
  onDirections,
  onArrived,
  onNext,
  onFinish,
  children,
}: GoPageProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const isReducedMotion = useReducedMotion();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const [sectionsY, setSectionsY] = useState(0);
  const position = useGoPosition();
  const distanceM = distanceToCurrent(progress, position);
  const isSuggested = isArrivalSuggested(progress, distanceM);
  const { current } = progress;

  // « Vous semblez être sur place », said once per step, the focus left where it is.
  const announced = useRef<string | null>(null);
  useEffect(() => {
    if (isSuggested && current && announced.current !== current.step.id) {
      announced.current = current.step.id;
      AccessibilityInfo.announceForAccessibility(t('go.suggested'));
    }
  }, [current, isSuggested, t]);
  // « Hors connexion, la sortie continue », said once when the network goes.
  useEffect(() => {
    if (!isOnline) {
      AccessibilityInfo.announceForAccessibility(t('go.offline'));
    }
  }, [isOnline, t]);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });
  // M-10: the photo at half speed, darkened to 65 % on the way to the content; with « Réduire
  // les animations », it goes up with the page.
  const photoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -scrollY.get() * (isReducedMotion ? 1 : motion.scroll.photoParallax) },
    ],
  }));
  const darkenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [0, immersive.photoHeight], [0, SCROLL_DARKEN], 'clamp'),
  }));

  const photo = photoOf(route, current?.step.id ?? null);
  const status = statusText(t, progress);
  const line = lineText(t, progress, distanceM);
  const bar = progressText(t, progress);
  const stateKey = `${current?.step.id ?? 'end'}-${progress.phase}`;

  return (
    <View
      className="flex-1 bg-surface-strong"
      accessibilityViewIsModal
      accessibilityLabel={t('go.dialog', { title: planned.route.title })}
    >
      <StatusBar style="light" />
      <Animated.View
        pointerEvents="none"
        style={[styles.photo, { height: immersive.photoHeight }, photoStyle]}
      >
        {photo && (
          <Animated.View key={photo.url} entering={fade} style={StyleSheet.absoluteFill}>
            <Image
              source={{ uri: photo.url }}
              contentFit="cover"
              accessibilityIgnoresInvertColors
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}
        <View style={[StyleSheet.absoluteFill, { experimental_backgroundImage: immersive.veil }]} />
        <Animated.View style={[StyleSheet.absoluteFill, styles.darken, darkenStyle]} />
      </Animated.View>

      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: sheetPeek + insets.bottom }}
      >
        <View
          className="justify-end px-20 pb-16"
          style={{ minHeight: height - sheetPeek - insets.bottom, paddingTop: insets.top + 72 }}
        >
          <View className="gap-16">
            <TextVeil bleed={BLOCK_PADDING} />
            {isSuggested && (
              <Animated.View
                entering={isReducedMotion ? fade : FadeInDown.duration(motion.durations.fade)}
                className="flex-row items-center gap-8 self-start rounded-pill bg-blue px-12 py-6"
              >
                <Icon name="map-pin" weight="fill" size="icon-s" color="on-blue" />
                <Text variant="label-strong" color="on-blue" isDense>
                  {t('go.suggested')}
                </Text>
              </Animated.View>
            )}
            <Animated.View
              key={stateKey}
              entering={fade}
              accessible
              accessibilityRole="header"
              accessibilityLabel={headerSpoken(t, progress, distanceM)}
              className="gap-6"
            >
              <View className="flex-row items-center gap-8">
                <Icon
                  name={progress.phase === 'on_site' ? 'map-pin' : 'person-simple-walk'}
                  weight={progress.phase === 'on_site' ? 'fill' : 'regular'}
                  size="icon-s"
                  color="on-strong"
                />
                <Text variant="body-medium" color="on-strong" className="shrink">
                  {status.short}
                </Text>
              </View>
              {current && (
                <Text variant="title-xl" color="on-strong">
                  {stepName(current.step)}
                </Text>
              )}
              {line && (
                <Text variant="body" color="on-strong-muted">
                  {line.short}
                </Text>
              )}
            </Animated.View>
            <GoProgressBar progress={progress} {...bar} />
            <GoCommands
              progress={progress}
              onDirections={onDirections}
              onArrived={() => onArrived(isSuggested)}
              onNext={onNext}
              onFinish={onFinish}
            />
            {children && current && (
              <Pressable
                accessibilityRole="button"
                hitSlop={12}
                onPress={() =>
                  scrollRef.current?.scrollTo({ y: sectionsY, animated: !isReducedMotion })
                }
                className="flex-row items-center justify-center gap-8 self-center py-4"
              >
                <Text variant="body-medium" color="on-strong">
                  {t('go.discover')}
                </Text>
                <Icon name="caret-down" size="icon-s" color="on-strong" />
              </Pressable>
            )}
          </View>
        </View>
        <View
          onLayout={(event) => setSectionsY(event.nativeEvent.layout.y)}
          className="gap-12 px-20"
        >
          {children}
        </View>
      </Animated.ScrollView>

      <View
        pointerEvents="box-none"
        className="gap-12 px-16"
        style={[styles.topBar, { paddingTop: insets.top + 8 }]}
      >
        <View className="flex-row items-center gap-12">
          <PhotoDisc label={t('go.collapse')} onPress={onCollapse} />
          <Text
            variant="title-s"
            color="on-strong"
            isDense
            numberOfLines={2}
            className="flex-1 text-center"
          >
            {planned.route.title}
          </Text>
          {/* The map of the route comes later: its place keeps the title centred. */}
          <View className="size-disc" />
        </View>
        {/* The credit of a free photo, under the place of the map button (D-052). */}
        {photo?.credit && (
          <View className="self-end">
            <PhotoCredit credit={photo.credit} />
          </View>
        )}
        {!isOnline && (
          <Animated.View
            entering={fade}
            className="flex-row items-center gap-8 self-center rounded-pill bg-photo-shade px-12 py-6"
          >
            <Icon {...uiIcon('offline')} size="icon-s" color="on-strong" />
            <Text variant="label-strong" color="on-strong" isDense>
              {t('go.offline')}
            </Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { position: 'absolute', left: 0, right: 0, top: 0 },
  // The ink of the page over the photo while it scrolls.
  darken: { backgroundColor: colors['surface-strong'] },
  topBar: { position: 'absolute', left: 0, right: 0, top: 0 },
});
