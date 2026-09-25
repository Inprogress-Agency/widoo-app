import { useEffect, useRef, type ComponentRef, type ReactNode } from 'react';
import { View } from 'react-native';
import { Mapbox } from './mapbox';

interface MapImageProps {
  /** Name the layers use in `iconImage`. */
  name: string;
  /** A new value takes a new picture: a photo of the view has loaded. */
  version?: number;
  children: ReactNode;
}

/**
 * A React view the map turns into an image of its style. Mapbox takes the picture when the view
 * mounts, before its layout on the new architecture: it takes it again once laid out, and at each
 * new `version`. One view, never flattened into its children. The picture never shows vector
 * icons (react-native-svg draws on screen only): photos, text and plain shapes only.
 */
export function MapImage({ name, version = 0, children }: MapImageProps) {
  const image = useRef<ComponentRef<typeof Mapbox.Image>>(null);

  useEffect(() => {
    if (version > 0) {
      image.current?.refresh();
    }
  }, [version]);

  return (
    <Mapbox.Image ref={image} name={name}>
      <View collapsable={false} onLayout={() => image.current?.refresh()} className="self-start">
        {children}
      </View>
    </Mapbox.Image>
  );
}
