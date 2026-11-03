/**
 * What becomes of a photo sent (wiki Securite-et-RGPD › Upload, #47): decoded as an image or
 * refused, turned upright by its EXIF orientation, then encoded again in JPEG without any
 * metadata (EXIF, with the GPS position, XMP, IPTC, ICC profile), in three widths.
 */
import sharp, { type OutputInfo, type Sharp } from 'sharp';
import { photoWidths, type PhotoWidth } from './urls';

/** Formats decoded, those of `photoContentTypes`: never a GIF, an SVG or a HEIF. */
const decodedFormats: ReadonlySet<string> = new Set(['jpeg', 'png', 'webp']);

/**
 * Pixels of an original, at most: 40 million, ten times a 24 MP phone photo, far beyond the
 * 1600 px the app sends, and short of what would exhaust an instance (decompression bomb).
 */
const maxInputPixels = 40_000_000;

/** Same quality as the compression of the app before sending (1600 px, JPEG 80 %). */
const jpegQuality = 80;

/** A file that is not a JPEG, PNG or WebP image, or that cannot be decoded. */
export class InvalidPhoto extends Error {
  constructor() {
    super('The file sent is not a JPEG, PNG or WebP photo');
  }
}

export type ProcessedPhoto = {
  /** Dimensions of the largest variant, upright. */
  width: number;
  height: number;
  variants: { width: PhotoWidth; data: Buffer }[];
};

/** One width of the upright image, its longest side at most, never enlarged. */
const encode = (upright: Sharp, width: PhotoWidth) =>
  upright
    .clone()
    .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: jpegQuality, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

/**
 * The variants of `original`, in each of `photoWidths`. Any failure of the decoder (unknown,
 * truncated or oversized file) is a file the API refuses, never a 500.
 */
export async function processPhoto(original: Buffer): Promise<ProcessedPhoto> {
  const image = sharp(original, { failOn: 'error', limitInputPixels: maxInputPixels });
  let encoded: { width: PhotoWidth; data: Buffer; info: OutputInfo }[];
  try {
    // The header alone: an unexpected format is refused before anything is decoded.
    const { format } = await image.metadata();
    if (!decodedFormats.has(format)) throw new InvalidPhoto();
    const upright = image.rotate();
    encoded = await Promise.all(
      photoWidths.map(async (width) => ({ width, ...(await encode(upright, width)) })),
    );
  } catch {
    throw new InvalidPhoto();
  }
  const { info } = encoded[encoded.length - 1] ?? {};
  if (!info) throw new Error('No variant of the photo was encoded');
  return {
    width: info.width,
    height: info.height,
    variants: encoded.map(({ width, data }) => ({ width, data })),
  };
}
