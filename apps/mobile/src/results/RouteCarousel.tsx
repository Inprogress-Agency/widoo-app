import { FlashList, type FlashListRef, type ViewToken } from '@shopify/flash-list';
import type { LatLng, RouteCard as RouteCardData } from '@widoo/shared';
import { size, spacing } from '@widoo/tokens';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { RouteCard } from './RouteCard';
import { RouteCardSkeleton } from './RouteCardSkeleton';

interface RouteCarouselProps {
  routes: readonly RouteCardData[];
  position: LatLng | null;
  onOpen: (route: RouteCardData) => void;
  /** The cards the user sees, in order, each time they change. */
  onVisible?: (visible: { route: RouteCardData; index: number }[]) => void;
  /** The leading card, each time a scroll of the user brings another one first. */
  onFocus?: (route: RouteCardData) => void;
}

/** A card counts as seen once half of it is on screen. */
const viewabilityConfig = { itemVisiblePercentThreshold: 50 };

/**
 * Horizontal carousel of route cards, virtualised by FlashList: only the cards on screen are
 * drawn. Every card takes the height of the tallest one seen, so that the row stays even when
 * the text grows (Direction-Artistique › Accessibilité).
 */
export function RouteCarousel({
  routes,
  position,
  onOpen,
  onVisible,
  onFocus,
}: RouteCarouselProps) {
  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined);
  // FlashList reads its viewability callback once: the latest handlers are read through a ref.
  const handlers = useRef({ onVisible, onFocus });
  useEffect(() => {
    handlers.current = { onVisible, onFocus };
  }, [onVisible, onFocus]);
  /** Only a scroll of the user moves the map, never the first cards of new results. */
  const isUserScroll = useRef(false);
  const leadingId = useRef<string | null>(null);
  const list = useRef<FlashListRef<RouteCardData>>(null);
  useEffect(() => {
    isUserScroll.current = false;
    leadingId.current = null;
    // FlashList tells viewability by index: new results on the same indices as the old ones
    // would never be reported as seen without a scroll.
    list.current?.recomputeViewableItems();
  }, [routes]);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<RouteCardData>[] }) => {
      const visible = viewableItems.flatMap((token) =>
        token.item && token.index !== null ? [{ route: token.item, index: token.index }] : [],
      );
      handlers.current.onVisible?.(visible);
      const leading = visible[0]?.route;
      if (leading && leading.id !== leadingId.current) {
        leadingId.current = leading.id;
        if (isUserScroll.current) {
          handlers.current.onFocus?.(leading);
        }
      }
    },
    [],
  );

  return (
    <FlashList
      ref={list}
      horizontal
      data={routes}
      keyExtractor={(route) => route.id}
      showsHorizontalScrollIndicator={false}
      // Each scroll settles a card at the left edge, the one the map comes round to.
      snapToInterval={size['card-w'] + spacing['space-12']}
      decelerationRate="fast"
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={Separator}
      viewabilityConfig={viewabilityConfig}
      onViewableItemsChanged={handleViewableItemsChanged}
      onScrollBeginDrag={() => {
        isUserScroll.current = true;
      }}
      renderItem={({ item }) => (
        <RouteCard
          route={item}
          position={position}
          onPress={() => onOpen(item)}
          minHeight={cardHeight}
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            setCardHeight((tallest) =>
              tallest === undefined || height > tallest ? height : tallest,
            );
          }}
        />
      )}
    />
  );
}

function Separator() {
  return <View className="w-12" />;
}

/** Three loading cards (Ecrans › E-01, chargement), announced busy with the search. */
export function SkeletonCarousel({ label }: { label: string }) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      className="flex-row gap-12 overflow-hidden px-16"
    >
      <RouteCardSkeleton />
      <RouteCardSkeleton />
      <RouteCardSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing['space-16'], paddingBottom: spacing['space-16'] },
});
