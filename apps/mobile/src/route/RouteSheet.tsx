import type { LatLng, RouteCard, RouteDetail } from '@widoo/shared';
import { motion, size, spacing } from '@widoo/tokens';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { IconLine, RetryLink, RouteHeader } from './RouteHeader';
import { RouteActions } from './RouteActions';
import { CreatorBox, RouteReviews } from './RouteCommunity';
import { RouteHero, SHEET_OVERLAP } from './RouteHero';
import { Description, DescriptionSkeleton, RouteInfo } from './RouteInfo';
import { RouteSteps } from './RouteSteps';
import { RouteTopBar } from './RouteTopBar';
import { TextLink } from '../ui/TextLink';
import { RemovedRoute } from './RemovedRoute';
import { newScrollDepths, type ScrollDepth } from './scrollDepth';
import { reportedLine } from './sheetText';
import type { RouteSheetState } from './useRouteSheet';

export interface RouteSheetProps {
  state: RouteSheetState;
  onRetry: () => void;
  onClose: () => void;
  onShare: (route: Pick<RouteCard, 'id' | 'title'>) => void;
  onGo: (route: RouteDetail | RouteCard) => void;
  /** « Programmer », or the date of the planning of the route (E-06). */
  onPlan: (route: RouteDetail) => void;
  plannedDate: { label: string; spoken: string } | null;
  /** « Voir sur la carte », when the route is among the results of the home (E-04). */
  onSeeOnMap: (() => void) | null;
  /** « Voir des parcours proches » of a withdrawn route: the home centred on its zone. */
  onNearby: (near: LatLng) => void;
  /** « Voir le profil » of the creator box, to its public profile (E-16). */
  onOpenCreator?: (author: NonNullable<RouteDetail['author']>) => void;
  /** « Voir les 128 avis », to every review (E-05, D-013). */
  onOpenReviews?: (routeId: string) => void;
  onScrollDepth: (depth: ScrollDepth) => void;
  /** Opened at a step from « Voir plus » of the map, from 0: unfolded, scrolled to. */
  initialStep?: number;
  now?: Date;
}

/** Height of the top bar: the 44-point discs and their margins (Ecrans › E-05, défilement). */
const BAR_HEIGHT = size.disc + 2 * spacing['space-8'];

/**
 * The route sheet (E-05): what the card knows at once, then the detail; a modal over the tabs,
 * closed with its chevron or by sliding it down. Read as the dialog « Fiche du parcours {titre} », the title focused at the opening.
 */
export function RouteSheet({
  state,
  onRetry,
  onClose,
  onShare,
  onGo,
  onPlan,
  plannedDate,
  onSeeOnMap,
  onNearby,
  onOpenCreator,
  onOpenReviews,
  onScrollDepth,
  initialStep,
  now = new Date(),
}: RouteSheetProps) {
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  /** Room taken at the top by the status bar and the bar of the sheet. */
  const topRoom = insets.top + BAR_HEIGHT;
  const isReducedMotion = useReducedMotion();
  const scroll = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const pull = useSharedValue(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const layout = useRef({
    sheet: 0,
    info: 0,
    steps: 0,
    list: 0,
    end: 0,
    content: 0,
    reviews: 0,
    items: [] as number[],
  });
  const reached = useRef(new Set<ScrollDepth>());

  const route = state.status === 'ready' ? state.route : null;
  // The detail once it answered, else the card of the list, if one holds the route.
  const card: RouteDetail | RouteCard | null =
    route ?? (state.status === 'ready' ? null : state.known);

  const stepTop = (index: number) => {
    const { sheet, steps, list, items } = layout.current;
    return sheet + steps + list + (items[index] ?? 0);
  };
  /** « Voir l'étape »: the sheet scrolls to the step, then unfolds it. */
  const showStep = (index: number) => {
    scroll.current?.scrollTo({
      y: Math.max(0, stepTop(index) - topRoom - spacing['space-16']),
      animated: !isReducedMotion,
    });
    setTimeout(() => setExpanded(index), isReducedMotion ? 0 : motion.durations.page);
  };
  const hasInitialStep = useRef(false);
  useEffect(() => {
    if (route && initialStep !== undefined && !hasInitialStep.current && route.steps[initialStep]) {
      hasInitialStep.current = true;
      // Once laid out: the offsets of the steps are known after the first frame.
      requestAnimationFrame(() => showStep(initialStep));
    }
  });

  const trackDepths = (offset: number) => {
    const { sheet, info, steps, list, end, content } = layout.current;
    const tops = route
      ? {
          info: sheet + info,
          timeline: sheet + steps,
          steps: sheet + steps + list + end,
          end: content,
        }
      : {};
    for (const depth of newScrollDepths(tops, offset + windowHeight, reached.current)) {
      onScrollDepth(depth);
    }
  };
  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.set(event.contentOffset.y);
    },
    onEndDrag: (event) => {
      scheduleOnRN(trackDepths, event.contentOffset.y);
    },
    onMomentumEnd: (event) => {
      scheduleOnRN(trackDepths, event.contentOffset.y);
    },
  });

  // A full screen modal has no gesture of its own: pulled down from the top, the sheet follows
  // the finger and closes past a quarter of the screen, or springs back (`springGesture`).
  const native = Gesture.Native();
  const closePan = Gesture.Pan()
    .activeOffsetY(size['touch-min'] / 2)
    .failOffsetX([-size['touch-min'] / 2, size['touch-min'] / 2])
    .simultaneousWithExternalGesture(native)
    .onUpdate((event) => {
      pull.set(scrollY.get() <= 0 ? Math.max(0, event.translationY) : 0);
    })
    .onEnd(() => {
      if (pull.get() > windowHeight / 4) {
        scheduleOnRN(onClose);
      } else {
        pull.set(withSpring(0, motion.springGesture));
      }
    });
  const pulled = useAnimatedStyle(() => ({ transform: [{ translateY: pull.get() }] }));

  if (state.status === 'removed') {
    return (
      <RemovedRoute
        removedAt={state.removedAt}
        near={state.near}
        onClose={onClose}
        onNearby={onNearby}
      />
    );
  }

  const title = card?.title ?? '';
  const reported = route ? reportedLine(t, route.steps) : null;
  // The card of the list has its cover only, without its credit, until the sheet answers.
  const photos = route?.photos ?? (card?.coverUrl ? [{ url: card.coverUrl, credit: null }] : []);
  const creatorName = route?.isOfficial ? 'Widoo' : (route?.author?.firstName ?? 'Widoo');

  return (
    <GestureDetector gesture={closePan}>
      <Animated.View
        className="flex-1 bg-bg"
        style={pulled}
        accessibilityViewIsModal
        accessibilityLabel={t('route.dialog', { title })}
      >
        {/* First in the reading order, drawn above the content (Ecrans › E-05, ordre de lecture). */}
        <RouteTopBar
          title={title}
          scrollY={scrollY}
          barStart={size['hero-h'] - SHEET_OVERLAP - topRoom}
          onClose={onClose}
          onShare={card ? () => onShare(card) : undefined}
        />
        <GestureDetector gesture={native}>
          <Animated.ScrollView
            ref={scroll}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            // Pulled down from the top, the sheet itself moves, not its content.
            bounces={false}
            onContentSizeChange={(_, height) => {
              layout.current.content = height;
            }}
          >
            <RouteHero
              photos={photos}
              scrollY={scrollY}
              badges={{
                isVerified: card?.isVerified ?? false,
                isOfficial: card?.isOfficial ?? false,
                isPremium: card?.access === 'premium',
                isPrivate: route?.status === 'private',
              }}
            />
            <View
              className="gap-24 rounded-t-sheet bg-bg px-16 pb-32 pt-24"
              style={{ marginTop: -SHEET_OVERLAP }}
              onLayout={(event) => {
                layout.current.sheet = event.nativeEvent.layout.y;
              }}
            >
              {card ? (
                <RouteHeader
                  route={card}
                  isCertified={route?.creator.isCertified ?? false}
                  sharedBy={route?.sharedBy?.firstName ?? null}
                  // « 128 avis » goes down to the reviews, once the detail has them.
                  onReviews={
                    route
                      ? () =>
                          scroll.current?.scrollTo({
                            y: layout.current.sheet + layout.current.reviews - topRoom,
                            animated: !isReducedMotion,
                          })
                      : undefined
                  }
                />
              ) : (
                state.status === 'loading' && <DescriptionSkeleton />
              )}
              {reported && (
                <IconLine
                  icon="alert"
                  color="alert"
                  isStatus
                  action={
                    <TextLink
                      label={t('route.seeStep')}
                      accessibilityLabel={t('route.seeStepLabel', { place: reported.place })}
                      role="button"
                      onPress={() => showStep(reported.firstIndex)}
                    />
                  }
                >
                  {reported.text}
                </IconLine>
              )}
              {state.status === 'error' && (
                <IconLine
                  icon={state.isOffline ? 'offline' : 'error'}
                  color="muted"
                  isStatus
                  action={<RetryLink onPress={onRetry} />}
                >
                  {state.isOffline ? t('route.offline') : t('route.error')}
                </IconLine>
              )}
              {state.status === 'loading' && card && <DescriptionSkeleton />}
              {route && (
                <>
                  <Description text={route.description} />
                  <View
                    onLayout={(event) => {
                      layout.current.info = event.nativeEvent.layout.y;
                    }}
                  >
                    <RouteInfo route={route} />
                  </View>
                  <View
                    onLayout={(event) => {
                      layout.current.steps = event.nativeEvent.layout.y;
                    }}
                  >
                    <RouteSteps
                      route={route}
                      expanded={expanded}
                      onToggle={(index) =>
                        setExpanded((current) => (current === index ? null : index))
                      }
                      onSeeOnMap={onSeeOnMap}
                      creatorName={creatorName}
                      now={now}
                      onListLayout={(y) => {
                        layout.current.list = y;
                      }}
                      onStepLayout={(index, y) => {
                        layout.current.items[index] = y;
                      }}
                      onEndLayout={(y) => {
                        layout.current.end = y;
                      }}
                    />
                  </View>
                  <CreatorBox route={route} onOpenCreator={onOpenCreator} />
                  <View
                    onLayout={(event) => {
                      layout.current.reviews = event.nativeEvent.layout.y;
                    }}
                  >
                    <RouteReviews route={route} onOpenReviews={onOpenReviews} />
                  </View>
                </>
              )}
            </View>
          </Animated.ScrollView>
        </GestureDetector>
        {card && (
          <RouteActions
            isLocked={card.isLocked}
            onGo={() => onGo(card)}
            onPlan={route ? () => onPlan(route) : null}
            plannedDate={plannedDate}
          />
        )}
      </Animated.View>
    </GestureDetector>
  );
}
