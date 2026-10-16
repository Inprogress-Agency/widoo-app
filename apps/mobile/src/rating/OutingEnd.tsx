import { ratingCommentMaxLength, type PlannedRoute } from '@widoo/shared';
import { motion, spacing } from '@widoo/tokens';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  BackHandler,
  findNodeHandle,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type Text as NativeText,
} from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../ui/Button';
import { Icon, uiIcon } from '../ui/Icon';
import { StickyBar } from '../ui/StickyBar';
import { Text } from '../ui/Text';
import { TextField } from '../ui/TextField';
import { endTiles, ratingLabel, ratingOffer, type EndTile } from './endText';
import { StarRating } from './StarRating';
import type { GivenRating } from './given';

/** A change of state fades in place (M-08), kept with « Réduire les animations ». */
const stateFade = FadeIn.duration(motion.durations.fade).reduceMotion(ReduceMotion.Never);

/** A tile of the summary: a dense component, its text capped at 1.3 times like the sheet's. */
function SummaryTile({ tile }: { tile: EndTile }) {
  return (
    <View
      accessible
      accessibilityLabel={tile.spoken}
      className="items-center gap-4 rounded-block bg-surface px-8 py-12"
      style={{ flexGrow: 1, flexBasis: 0 }}
    >
      <Text variant="number-l" isDense>
        {tile.short}
      </Text>
      <Text variant="caption" color="muted" isDense className="text-center">
        {tile.label}
      </Text>
    </View>
  );
}

/** « Note à partir de 2 étapes faites », read as text: under half of the steps, no stars. */
function PartialNotice({ minDone }: { minDone: number }) {
  const { t } = useTranslation();
  return (
    <View accessible className="flex-row gap-12 rounded-section bg-surface p-16">
      <Icon name="star" weight="fill" size="icon-l" color="control-border" />
      <View className="flex-1 gap-4">
        <Text variant="title-s">{t('go.end.partial.title', { count: minDone })}</Text>
        <Text variant="body" color="muted">
          {t('go.end.partial.body')}
        </Text>
      </View>
    </View>
  );
}

interface OutingEndProps {
  outing: PlannedRoute;
  /** « Terminer »: the rating given, or null; the modal closes. */
  onFinish: (given: GivenRating | null) => void;
}

/**
 * E-15, the end of an outing (Ecrans › E-15, D-029, D-033, D-034): a white page in the modal of
 * the Go, without a cross. The summary in three tiles, then « Votre note », asked but never
 * required, once half of the steps are done; the comment offered once a star is chosen. An
 * outing already rated shows its rating, to change. « Terminer » stays active without a rating.
 */
export function OutingEnd({ outing, onFinish }: OutingEndProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const title = useRef<NativeText>(null);
  const scroll = useRef<ScrollView>(null);
  const [rating, setRating] = useState<number | null>(outing.myRating?.rating ?? null);
  const [comment, setComment] = useState(outing.myRating?.comment ?? '');
  const offer = ratingOffer(outing);
  const [now] = useState(() => new Date());
  const finish = () => onFinish(rating === null ? null : { rating, comment });

  useEffect(() => {
    // Without a cross, E-15 is left by « Terminer » only: the back of Android does the same.
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onFinish(rating === null ? null : { rating, comment });
      return true;
    });
    return () => subscription.remove();
  }, [onFinish, rating, comment]);

  useEffect(() => {
    // The title takes the focus once E-15 has replaced E-07, so that it is read first.
    const timer = setTimeout(() => {
      const node = findNodeHandle(title.current);
      if (node) {
        AccessibilityInfo.setAccessibilityFocus(node);
      }
    }, motion.durations.base);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View entering={stateFade} className="flex-1 bg-bg">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-32 px-16"
          // Safe area measured at runtime.
          contentContainerStyle={{
            paddingTop: insets.top + spacing['space-32'],
            paddingBottom: spacing['space-32'],
          }}
        >
          <View className="items-center gap-8">
            <View className="mb-8 size-marker items-center justify-center rounded-pill bg-green-soft">
              <Icon {...uiIcon('empty-past')} weight="fill" size="icon-l" color="green-ink" />
            </View>
            <Text ref={title} variant="title-xl" accessibilityRole="header" className="text-center">
              {t('go.end.title')}
            </Text>
            <Text variant="body" color="muted" className="text-center">
              {outing.route.title}
            </Text>
          </View>
          <View accessibilityRole="list" className="flex-row gap-12">
            {endTiles(t, outing, now).map((tile) => (
              <SummaryTile key={tile.key} tile={tile} />
            ))}
          </View>
          {offer.kind === 'partial' ? (
            <PartialNotice minDone={offer.minDone} />
          ) : (
            <View className="gap-16">
              <View className="items-center gap-4">
                <Text variant="title-l" className="text-center">
                  {t('go.end.rating.title')}
                </Text>
                <Animated.View key={rating ?? 0} entering={stateFade}>
                  <Text
                    variant={rating === null ? 'body' : 'label-strong'}
                    color={rating === null ? 'muted' : 'ink'}
                    className="text-center"
                    accessibilityLiveRegion="polite"
                  >
                    {rating === null ? t('go.end.rating.hint') : ratingLabel(t, rating)}
                  </Text>
                </Animated.View>
              </View>
              <StarRating value={rating} onChange={setRating} label={t('go.end.rating.title')} />
              {rating !== null && (
                <Animated.View entering={stateFade}>
                  <TextField
                    label={t('go.end.comment.label')}
                    spokenLabel={t('go.end.comment.spoken')}
                    help={t('go.end.comment.help')}
                    value={comment}
                    onChangeText={setComment}
                    maxLength={ratingCommentMaxLength}
                    formatCounter={(count, max) => t('go.end.comment.counter', { count, max })}
                    isMultiline
                    // The field goes up with the keyboard, which would otherwise cover it.
                    onFocus={() =>
                      setTimeout(() => scroll.current?.scrollToEnd(), motion.durations.base)
                    }
                  />
                </Animated.View>
              )}
            </View>
          )}
        </ScrollView>
        <StickyBar>
          <Button label={t('go.end.finish')} onPress={finish} isDense isFullWidth />
        </StickyBar>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}
