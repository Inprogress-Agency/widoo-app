import { StyleSheet, View } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { CARD_PHOTO_HEIGHT } from './RouteCard';

/**
 * Loading card at the exact size of a route card (Ecrans › E-01, chargement): warm grey blocks
 * on the card surface, sweeping (M-09).
 */
export function RouteCardSkeleton() {
  return (
    <View className="h-card-h w-card-w gap-12 rounded-card bg-surface p-8">
      <Skeleton className="rounded-photo" style={styles.photo} />
      <View className="gap-8 px-8">
        <Skeleton className="h-20 rounded-thumb" />
        <Skeleton className="h-16 rounded-thumb" style={styles.shortLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { height: CARD_PHOTO_HEIGHT },
  // The place line is shorter than the title.
  shortLine: { width: '60%' },
});
