import {
  ClipOp,
  FilterMode,
  ImageFormat,
  MipmapMode,
  Skia,
  type SkCanvas,
  type SkImage,
} from '@shopify/react-native-skia';
import type { RouteCard } from '@widoo/shared';
import { colors, type ColorToken } from '@widoo/tokens';
import { Directory, File, Paths } from 'expo-file-system';
import { useEffect, useState } from 'react';
import { PixelRatio, Platform } from 'react-native';
import { markerImage } from './markers';
import {
  coverSquare,
  emptyMarkerImage,
  labelPill,
  labelPillImage,
  markerPhoto,
} from './markerShape';

/**
 * Images of the route markers, drawn by the app with Skia and handed to the map as PNG files.
 * The map loads them itself, on both systems: no React view to picture, whose photo Android never
 * loads while the view is not on screen.
 */

/** An image of the map style, as `Images` of @rnmapbox/maps takes it. */
export interface MapStyleImage {
  image: { uri: string };
  /** Pixels per point: the image is drawn at the density of the screen. */
  scale: number;
  stretchX?: [number, number][];
}

/** Photos drawn at the same time: the map receives up to a page of routes at once. */
const concurrentDraws = 6;

const folder = new Directory(Paths.cache, 'map-markers');

function paintOf(color: ColorToken) {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(colors[color]));
  return paint;
}

/** File name of an image: the same drawing gives the same file, kept between launches. */
function fileName(key: string): string {
  // FNV-1a: a short, stable name; the key stays readable in its length.
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index++) {
    hash = Math.imul(hash ^ key.charCodeAt(index), 0x01000193) >>> 0;
  }
  return `${hash.toString(16)}-${key.length}.png`;
}

/**
 * Absolute path of a file: @rnmapbox/maps reads a path on both systems, while Android takes a
 * `file://` address for the name of a resource of the app first, and logs an error.
 */
function pathOf(file: File): string {
  return decodeURIComponent(file.uri.replace(/^file:\/\//, ''));
}

/** Draws on a canvas in points, at the density of the screen, and writes the PNG file. */
function drawToFile(
  key: string,
  width: number,
  height: number,
  draw: (canvas: SkCanvas) => void,
): string | null {
  const scale = PixelRatio.get();
  const surface = Skia.Surface.Make(Math.ceil(width * scale), Math.ceil(height * scale));
  if (!surface) {
    return null;
  }
  const canvas = surface.getCanvas();
  canvas.scale(scale, scale);
  draw(canvas);
  surface.flush();
  const image = surface.makeImageSnapshot();
  const bytes = image.encodeToBytes(ImageFormat.PNG);
  image.dispose();
  surface.dispose();
  if (!folder.exists) {
    folder.create({ idempotent: true, intermediates: true });
  }
  const file = new File(folder, fileName(`${key}@${scale}`));
  file.write(bytes);
  return pathOf(file);
}

/** The photo box with its white rim and its point; the photo, or warm grey without one. */
function drawMarker(canvas: SkCanvas, photo: SkImage | null) {
  const { side, radius, rim, pointDepth } = markerPhoto;
  const white = paintOf('bg');
  // The point: a turned square centred on the bottom edge, its top half under the photo.
  const middle = side / 2;
  const point = Skia.PathBuilder.Make()
    .moveTo(middle, side - pointDepth)
    .lineTo(middle + pointDepth, side)
    .lineTo(middle, side + pointDepth)
    .lineTo(middle - pointDepth, side)
    .close()
    .build();
  canvas.drawPath(point, white);
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(0, 0, side, side), radius, radius), white);
  const inner = Skia.RRectXY(
    Skia.XYWHRect(rim, rim, side - 2 * rim, side - 2 * rim),
    radius - rim,
    radius - rim,
  );
  if (!photo) {
    canvas.drawRRect(inner, paintOf('surface'));
    return;
  }
  const crop = coverSquare(photo.width(), photo.height());
  canvas.save();
  canvas.clipRRect(inner, ClipOp.Intersect, true);
  // Mipmaps: the photo shrinks a lot, from its full size to the marker.
  canvas.drawImageRectOptions(
    photo,
    Skia.XYWHRect(crop.x, crop.y, crop.side, crop.side),
    inner.rect,
    FilterMode.Linear,
    MipmapMode.Linear,
  );
  canvas.restore();
}

/**
 * Stretch of an image, in points on iOS, in pixels on Android: @rnmapbox/maps 10.3 scales it on
 * iOS only.
 */
function stretchOf(stretch: [number, number][], scale: number): [number, number][] {
  return Platform.OS === 'android'
    ? stretch.map(([from, to]) => [from * scale, to * scale])
    : stretch;
}

/** The images every marker shares: the empty photo box and the label pill of that height. */
export function sharedMarkerImages(pillHeight: number): Record<string, MapStyleImage> {
  const scale = PixelRatio.get();
  const images: Record<string, MapStyleImage> = {};
  const empty = drawToFile('empty', markerPhoto.width, markerPhoto.height, (canvas) =>
    drawMarker(canvas, null),
  );
  if (empty) {
    images[emptyMarkerImage] = { image: { uri: empty }, scale };
  }
  const pill = labelPill(pillHeight);
  const pillFile = drawToFile(`pill-${pill.height}`, pill.width, pill.height, (canvas) =>
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(0, 0, pill.width, pill.height), pill.radius, pill.radius),
      paintOf('bg'),
    ),
  );
  if (pillFile) {
    images[labelPillImage] = {
      image: { uri: pillFile },
      scale,
      stretchX: stretchOf(pill.stretchX, scale),
    };
  }
  return images;
}

/** The marker image of a photo: drawn once per photo and density, then read from its file. */
const drawnPhotos = new Map<string, Promise<string | null>>();

async function drawPhotoMarker(photoUrl: string): Promise<string | null> {
  const key = `photo-${photoUrl}`;
  const cached = new File(folder, fileName(`${key}@${PixelRatio.get()}`));
  if (cached.exists) {
    return pathOf(cached);
  }
  // The network of React Native: its errors, its timeouts and its HTTP cache.
  const response = await fetch(photoUrl);
  if (!response.ok) {
    return null;
  }
  const data = Skia.Data.fromBytes(new Uint8Array(await response.arrayBuffer()));
  const photo = Skia.Image.MakeImageFromEncoded(data);
  data.dispose();
  if (!photo) {
    return null;
  }
  const uri = drawToFile(key, markerPhoto.width, markerPhoto.height, (canvas) =>
    drawMarker(canvas, photo),
  );
  photo.dispose();
  return uri;
}

function photoMarker(photoUrl: string): Promise<string | null> {
  let drawn = drawnPhotos.get(photoUrl);
  if (!drawn) {
    // A photo that fails keeps the empty box; the next set of routes tries it again.
    drawn = drawPhotoMarker(photoUrl).then(
      (uri) => {
        if (!uri) {
          drawnPhotos.delete(photoUrl);
        }
        return uri;
      },
      () => {
        drawnPhotos.delete(photoUrl);
        return null;
      },
    );
    drawnPhotos.set(photoUrl, drawn);
  }
  return drawn;
}

/**
 * Marker images of the routes with a photo, by image name, as they are drawn: a few at a time,
 * the map taking each batch as it comes. A route missing here shows the empty photo box.
 */
export function usePhotoMarkerImages(routes: readonly RouteCard[]): Record<string, MapStyleImage> {
  const [images, setImages] = useState<Record<string, MapStyleImage>>({});

  useEffect(() => {
    let isCurrent = true;
    const scale = PixelRatio.get();
    const pending = routes.flatMap((route) =>
      route.coverUrl ? [{ name: markerImage(route.id), photoUrl: route.coverUrl }] : [],
    );
    const drawAll = async () => {
      for (let start = 0; start < pending.length; start += concurrentDraws) {
        const batch = pending.slice(start, start + concurrentDraws);
        const uris = await Promise.all(batch.map(({ photoUrl }) => photoMarker(photoUrl)));
        if (!isCurrent) {
          return;
        }
        setImages((current) => {
          const next = { ...current };
          batch.forEach(({ name }, index) => {
            const uri = uris[index];
            if (uri) {
              next[name] = { image: { uri }, scale };
            }
          });
          return next;
        });
      }
    };
    void drawAll();
    return () => {
      isCurrent = false;
    };
  }, [routes]);

  return images;
}
