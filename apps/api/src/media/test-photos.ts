/**
 * Photos of the tests, drawn on the spot: a plain colour, never a real photo (CLAUDE.md). The
 * EXIF carries a fictitious GPS position and an orientation, as a phone writes them.
 */
import sharp from 'sharp';

/** A fictitious position near Notre-Dame, as degrees, minutes and seconds. */
export const fictitiousGps = {
  GPSLatitudeRef: 'N',
  GPSLatitude: '48/1 51/1 11/1',
  GPSLongitudeRef: 'E',
  GPSLongitude: '2/1 20/1 59/1',
};

/**
 * A JPEG `width` × `height` as the sensor stored it, with a GPS position and the EXIF
 * orientation 6: shown upright, it is `height` wide and `width` tall.
 */
export const jpegWithGps = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#3a4fa8' } })
    .withMetadata({ orientation: 6 })
    .withExifMerge({ IFD3: fictitiousGps })
    .jpeg()
    .toBuffer();

/** Whether the EXIF of `image` points to a GPS directory (tag 0x8825 in IFD0). */
export async function hasGpsExif(image: Buffer): Promise<boolean> {
  const { exif } = await sharp(image).metadata();
  if (!exif) return false;
  const littleEndian = exif.subarray(6, 8).toString('latin1') === 'II';
  return exif.includes(Buffer.from(littleEndian ? [0x25, 0x88] : [0x88, 0x25]));
}
