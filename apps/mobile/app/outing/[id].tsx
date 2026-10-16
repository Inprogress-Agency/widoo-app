import { router, useLocalSearchParams } from 'expo-router';
import { OutingScreen } from '../../src/outing/OutingScreen';
import { routeHref } from '../../src/results/navigation';

/** « Votre sortie » (E-08), pushed from « À venir » or the route sheet, without the tab bar (M-03). */
export default function OutingRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <OutingScreen
      outingId={id}
      onBack={() => router.back()}
      onSeeRoute={(routeId) => router.push(routeHref({ id: routeId }))}
    />
  );
}
