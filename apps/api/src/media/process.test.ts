import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { InvalidPhoto, maxOriginalSide, processPhoto } from './process';
import { jpegWithMetadata, metadataOf } from './test-photos';

const none = { exif: false, gps: false, xmp: false, icc: false, iptc: false, orientation: null };

const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#fff' } })
    .png()
    .toBuffer();

describe('processPhoto', () => {
  it('encodes a photo again upright, without EXIF, GPS position, XMP, ICC nor IPTC', async () => {
    const original = await jpegWithMetadata(2400, 1600);
    // The fixture carries every metadata the output must lose.
    expect(await metadataOf(original)).toEqual({
      exif: true,
      gps: true,
      xmp: true,
      icc: true,
      iptc: true,
      orientation: 6,
    });

    const processed = await processPhoto(original);

    // Orientation 6: the 2400 × 1600 of the sensor is 1600 × 2400 upright.
    expect(processed).toMatchObject({ width: 1067, height: 1600 });
    expect(processed.variants.map((variant) => variant.width)).toEqual([400, 800, 1600]);
    for (const { width, data } of processed.variants) {
      const metadata = await sharp(data).metadata();
      expect(metadata).toMatchObject({ format: 'jpeg', height: width });
      expect(await metadataOf(data)).toEqual(none);
      expect(data.includes(Buffer.from('Exif'))).toBe(false);
      expect(data.includes(Buffer.from('Photoshop 3.0'))).toBe(false);
    }
  });

  it('never enlarges a small photo', async () => {
    const processed = await processPhoto(await png(300, 200));
    expect(processed).toMatchObject({ width: 300, height: 200 });
    for (const { data } of processed.variants) {
      expect(await sharp(data).metadata()).toMatchObject({ width: 300, height: 200 });
    }
  });

  it('lays a transparent PNG on white', async () => {
    const transparent = await sharp({
      create: { width: 40, height: 40, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer();
    const [variant] = (await processPhoto(transparent)).variants;
    const { channels } = await sharp(variant?.data).stats();
    expect(channels.map((channel) => Math.round(channel.mean))).toEqual([255, 255, 255]);
  });

  it('takes a CMYK JPEG and serves it in sRGB', async () => {
    const cmyk = await sharp({
      create: { width: 300, height: 200, channels: 3, background: '#3a4fa8' },
    })
      .toColourspace('cmyk')
      .jpeg({ progressive: true })
      .toBuffer();
    expect(await sharp(cmyk).metadata()).toMatchObject({ space: 'cmyk', channels: 4 });
    const processed = await processPhoto(cmyk);
    for (const { data } of processed.variants) {
      expect(await sharp(data).metadata()).toMatchObject({
        format: 'jpeg',
        space: 'srgb',
        channels: 3,
      });
    }
  });

  it('takes 4096 px on a side, the most an original may have', async () => {
    const processed = await processPhoto(await png(maxOriginalSide, 1));
    expect(processed.width).toBe(1600);
  });

  // Small files a decoder would blow up in memory: refused on their header, never decoded.
  it.each([
    ['a side over 4096 px', () => png(maxOriginalSide + 1, 1)],
    [
      '16 bits a channel',
      () =>
        sharp({
          create: {
            width: 10,
            height: 10,
            channels: 4,
            background: { r: 1, g: 2, b: 3, alpha: 1 },
          },
        })
          .toColourspace('rgb16')
          .png()
          .toBuffer(),
    ],
    [
      'two frames, an animated WebP',
      async () => {
        const frame = (colour: string) =>
          sharp({ create: { width: 64, height: 64, channels: 3, background: colour } })
            .png()
            .toBuffer();
        return sharp([await frame('#f00'), await frame('#00f')], { join: { animated: true } })
          .webp()
          .toBuffer();
      },
    ],
  ])('refuses an original of %s before decoding it', async (_, file) => {
    await expect(processPhoto(await file())).rejects.toBeInstanceOf(InvalidPhoto);
  });

  it.each([
    ['a text file', async () => Buffer.from('Not a photo, a fictitious text.')],
    ['a PDF', async () => Buffer.from('%PDF-1.7 fictitious')],
    [
      'a GIF',
      () =>
        sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } })
          .gif()
          .toBuffer(),
    ],
    ['a truncated JPEG', async () => (await jpegWithMetadata(400, 300)).subarray(0, 300)],
  ])('refuses %s', async (_, file) => {
    await expect(processPhoto(await file())).rejects.toBeInstanceOf(InvalidPhoto);
  });
});
