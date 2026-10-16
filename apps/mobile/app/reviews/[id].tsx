import { router, useLocalSearchParams } from 'expo-router';
import { ReviewsScreen } from '../../src/route/ReviewsScreen';

/** Every review of a route (E-05 › « Voir les 128 avis »), pushed over its sheet (M-03). */
export default function ReviewsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReviewsScreen routeId={id} onBack={() => router.back()} />;
}
