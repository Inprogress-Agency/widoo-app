/**
 * Photos of the tests, drawn on the spot: a plain colour, never a real photo (CLAUDE.md). The
 * metadata are fictitious and all there, as a phone or an editing tool writes them: EXIF with a
 * GPS position and an orientation, XMP, an ICC profile and IPTC.
 */
import sharp from 'sharp';

/** A fictitious position near Notre-Dame, as degrees, minutes and seconds. */
export const fictitiousGps = {
  GPSLatitudeRef: 'N',
  GPSLatitude: '48/1 51/1 11/1',
  GPSLongitudeRef: 'E',
  GPSLongitude: '2/1 20/1 59/1',
};

const fictitiousXmp =
  '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/">' +
  '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description ' +
  'xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>Auteur fictif</dc:creator>' +
  '</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>';

/**
 * `jpeg` with an IPTC block, which sharp cannot write: an APP13 segment « Photoshop 3.0 » right
 * after the start of image, its IPTC-NAA resource holding a record version and a caption.
 */
function withIptc(jpeg: Buffer): Buffer {
  const caption = Buffer.from('Légende fictive', 'latin1');
  const iptc = Buffer.concat([
    Buffer.from([0x1c, 0x02, 0x00, 0x00, 0x02, 0x00, 0x04]),
    Buffer.from([0x1c, 0x02, 0x78, 0x00, caption.length]),
    caption,
  ]);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(iptc.length);
  const resource = Buffer.concat([
    Buffer.from('Photoshop 3.0\0', 'latin1'),
    Buffer.from('8BIM', 'latin1'),
    Buffer.from([0x04, 0x04, 0x00, 0x00]),
    size,
    iptc.length % 2 === 0 ? iptc : Buffer.concat([iptc, Buffer.from([0])]),
  ]);
  const length = Buffer.alloc(2);
  length.writeUInt16BE(resource.length + 2);
  return Buffer.concat([
    jpeg.subarray(0, 2),
    Buffer.from([0xff, 0xed]),
    length,
    resource,
    jpeg.subarray(2),
  ]);
}

/**
 * A JPEG `width` × `height` as the sensor stored it, with every metadata: EXIF (a GPS position,
 * the orientation 6: shown upright, it is `height` wide and `width` tall), XMP, a Display P3
 * profile and IPTC.
 */
export async function jpegWithMetadata(width: number, height: number): Promise<Buffer> {
  const jpeg = await sharp({ create: { width, height, channels: 3, background: '#3a4fa8' } })
    .withMetadata({ orientation: 6 })
    .withExifMerge({ IFD3: fictitiousGps })
    .withXmp(fictitiousXmp)
    .withIccProfile('p3')
    .jpeg()
    .toBuffer();
  return withIptc(jpeg);
}

/** Whether the EXIF of `image` points to a GPS directory (tag 0x8825 in IFD0). */
export async function hasGpsExif(image: Buffer): Promise<boolean> {
  const { exif } = await sharp(image).metadata();
  if (!exif) return false;
  const littleEndian = exif.subarray(6, 8).toString('latin1') === 'II';
  return exif.includes(Buffer.from(littleEndian ? [0x25, 0x88] : [0x88, 0x25]));
}

/** The metadata `image` carries, as sharp reads them. */
export async function metadataOf(image: Buffer) {
  const { exif, xmp, icc, iptc, orientation } = await sharp(image).metadata();
  return {
    exif: exif !== undefined,
    gps: await hasGpsExif(image),
    xmp: xmp !== undefined,
    icc: icc !== undefined,
    iptc: iptc !== undefined,
    orientation: orientation ?? null,
  };
}
