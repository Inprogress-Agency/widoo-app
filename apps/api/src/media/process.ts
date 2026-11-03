/**
 * What becomes of a photo sent (wiki Securite-et-RGPD › Upload, #47): its header read first and
 * the file refused unless it is what the app sends; then decoded once, turned upright by its EXIF
 * orientation, and encoded again in JPEG without any metadata (EXIF, with the GPS position, XMP,
 * IPTC, ICC profile), in three widths, the two smaller drawn from the pixels of the largest.
 */
import sharp, { type Metadata, type OutputInfo } from 'sharp';
import { photoWidths, type PhotoWidth } from './urls';

/** Formats decoded, those of `photoContentTypes`: never a GIF, an SVG or a HEIF. */
const decodedFormats: ReadonlySet<string> = new Set(['jpeg', 'png', 'webp']);

/**
 * Longest side of an original, in pixels. The app sends 1600 px; 4096 leaves room for a photo it
 * could not compress. With 8 bits and 4 channels at most, processing an original takes about
 * 175 MiB at worst, measured (a progressive CMYK JPEG of 4096 px), one at a time on an instance
 * (`inPhotoSlot`), within its 512 MiB.
 */
export const maxOriginalSide = 4096;
const maxChannels = 4;

/** Same quality as the compression of the app before sending (1600 px, JPEG 80 %). */
const jpegQuality = 80;

/** A file that is not a JPEG, PNG or WebP photo as the app sends it, or that cannot be decoded. */
export class InvalidPhoto extends Error {
  constructor() {
    super('The file sent is not a JPEG, PNG or WebP photo of 4096 px at most, 8 bits a channel');
  }
}

export type ProcessedPhoto = {
  /** Dimensions of the largest width, upright. */
  width: number;
  height: number;
  variants: { width: PhotoWidth; data: Buffer }[];
};

/**
 * Whether the header describes a photo the app sends, before any pixel is decoded: a JPEG, PNG or
 * WebP, of one frame, 4096 px at most on each side, 8 bits a channel, 4 channels at most. A small
 * file that would decode into hundreds of megabytes (decompression bomb) goes no further.
 */
const isSentPhoto = (header: Metadata) =>
  decodedFormats.has(header.format) &&
  header.width <= maxOriginalSide &&
  header.height <= maxOriginalSide &&
  header.depth === 'uchar' &&
  header.channels <= maxChannels &&
  (header.pages ?? 1) === 1;

/** One width from the upright pixels of the largest, its longest side at most, never enlarged. */
const encode = (pixels: Buffer, info: OutputInfo, width: PhotoWidth) =>
  sharp(pixels, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: jpegQuality, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

/**
 * The widths of `original`, refused (`InvalidPhoto`) unless its header is that of a photo the app
 * sends. The original is decoded once, into the largest width; the others come from its pixels,
 * one after the other. Any failure of the decoder (truncated file) is a refused file, never a 500.
 */
export async function processPhoto(original: Buffer): Promise<ProcessedPhoto> {
  const largest = photoWidths[photoWidths.length - 1];
  if (!largest) throw new Error('No width to encode');
  try {
    const input = sharp(original, { failOn: 'error', limitInputPixels: maxOriginalSide ** 2 });
    if (!isSentPhoto(await input.metadata())) throw new InvalidPhoto();
    const { data: pixels, info } = await input
      .rotate()
      .resize({ width: largest, height: largest, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const variants: ProcessedPhoto['variants'] = [];
    for (const width of photoWidths) {
      variants.push({ width, data: (await encode(pixels, info, width)).data });
    }
    return { width: info.width, height: info.height, variants };
  } catch {
    throw new InvalidPhoto();
  }
}
