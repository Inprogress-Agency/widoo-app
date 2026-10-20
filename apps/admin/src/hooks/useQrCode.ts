import { toDataURL } from 'qrcode';
import { useEffect, useState } from 'react';

/**
 * The QR code of `text` as an image (a `data:` address), null while it is drawn or when there is
 * no text. The image of a former text is never returned for a new one.
 */
export function useQrCode(text: string | null): string | null {
  const [drawn, setDrawn] = useState<{ text: string; image: string } | null>(null);

  useEffect(() => {
    if (text === null) {
      return;
    }
    let isCurrent = true;
    toDataURL(text, { margin: 1, width: 320 })
      .then((image) => isCurrent && setDrawn({ text, image }))
      .catch(() => isCurrent && setDrawn(null));
    return () => {
      isCurrent = false;
    };
  }, [text]);

  return drawn !== null && drawn.text === text ? drawn.image : null;
}
