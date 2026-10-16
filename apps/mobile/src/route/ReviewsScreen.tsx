import { useInfiniteQuery } from '@tanstack/react-query';
import { spacing } from '@widoo/tokens';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import { TopBar } from '../ui/TopBar';
import { ReviewItem } from './RouteCommunity';

/** Under `['routes']`: a rating sent from E-15 asks the reviews again with the cards. */
export const reviewsQueryKey = (routeId: string) => ['routes', 'reviews', routeId] as const;

/**
 * « Voir les 128 avis » of the route sheet (Ecrans › E-05, D-013): every visible review, newest
 * first, page after page, each with its rating as a figure after a star (« ★ 5 »).
 */
export function ReviewsScreen({ routeId, onBack }: { routeId: string; onBack: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const query = useInfiniteQuery({
    queryKey: reviewsQueryKey(routeId),
    queryFn: ({ pageParam, signal }) =>
      api.listRouteRatings(routeId, pageParam ? { cursor: pageParam } : {}, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const reviews = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <View className="flex-1 bg-bg">
      <TopBar
        title={t('route.reviews.title')}
        back={{ label: t('route.reviews.back'), onPress: onBack }}
      />
      <ScrollView
        contentContainerClassName="gap-16 px-16 pt-16"
        // Safe area measured at runtime.
        contentContainerStyle={{ paddingBottom: spacing['space-32'] + insets.bottom }}
      >
        <View className="gap-12">
          {reviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </View>
        {query.isError && reviews.length === 0 && (
          <View className="gap-12">
            <Text variant="body" color="muted">
              {t('route.reviews.failed')}
            </Text>
            <Button
              label={t('route.reviews.retry')}
              variant="secondary"
              onPress={() => void query.refetch()}
            />
          </View>
        )}
        {query.hasNextPage && (
          <Button
            label={t('route.reviews.more')}
            variant="secondary"
            onPress={() => void query.fetchNextPage()}
          />
        )}
      </ScrollView>
    </View>
  );
}
