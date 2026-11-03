import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { InvalidPhoto, processPhoto } from './process';
import { hasGpsExif, jpegWithGps } from './test-photos';

describe('processPhoto', () => {
  it('encodes a photo with a GPS position again, upright and without any metadata', async () => {
    const original = await jpegWithGps(2400, 1200);
    expect(await hasGpsExif(original)).toBe(true);

    const processed = await processPhoto(original);

    // Orientation 6: the 2400 × 1200 of the sensor is 1200 × 2400 upright.
    expect(processed).toMatchObject({ width: 800, height: 1600 });
    expect(processed.variants.map((variant) => variant.width)).toEqual([400, 800, 1600]);
    for (const { width, data } of processed.variants) {
      const metadata = await sharp(data).metadata();
      expect(metadata).toMatchObject({ format: 'jpeg', height: width, width: width / 2 });
      expect(metadata.exif).toBeUndefined();
      expect(metadata.icc).toBeUndefined();
      expect(metadata.xmp).toBeUndefined();
      expect(metadata.iptc).toBeUndefined();
      expect(metadata.orientation).toBeUndefined();
      expect(data.includes(Buffer.from('Exif'))).toBe(false);
    }
  });

  it('never enlarges a small photo', async () => {
    const small = await sharp({
      create: { width: 300, height: 200, channels: 3, background: '#fff' },
    })
      .png()
      .toBuffer();
    const processed = await processPhoto(small);
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
    ['a truncated JPEG', async () => (await jpegWithGps(400, 300)).subarray(0, 300)],
  ])('refuses %s', async (_, file) => {
    await expect(processPhoto(await file())).rejects.toBeInstanceOf(InvalidPhoto);
  });
});
