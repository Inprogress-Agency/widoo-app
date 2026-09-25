import { Image, View } from 'react-native';
import { MarkerLabel } from './MarkerLabel';

interface MapMarkerProps {
  /** Cover of the route; without one, warm grey (the map pictures no vector icon). */
  photoUrl: string | null;
  /** Duration, written as in the app: « 7 h ». */
  durationLabel: string;
  /** The photo has loaded or failed: the map takes a new picture of the marker. */
  onPhotoSettled?: () => void;
}

/**
 * Route marker of the map (Direction-Artistique › Carte): photo with rounded corners and a white
 * rim, a point towards its start, then the duration label. Drawn once as an image of the map,
 * which places it at every route start: never a React view per marker on the map.
 */
export function MapMarker({ photoUrl, durationLabel, onPhotoSettled }: MapMarkerProps) {
  // Laid out bottom up, so that the photo is painted last, over the top half of the point.
  return (
    <View className="flex-col-reverse items-center">
      <MarkerLabel label={durationLabel} />
      <View className="-mt-6 mb-4 size-12 rotate-45 bg-bg" />
      <View className="size-marker items-center justify-center overflow-hidden rounded-card border-2 border-bg bg-surface">
        {photoUrl && (
          <Image
            source={{ uri: photoUrl }}
            resizeMode="cover"
            resizeMethod="resize"
            onLoadEnd={onPhotoSettled}
            className="size-full"
          />
        )}
      </View>
    </View>
  );
}
