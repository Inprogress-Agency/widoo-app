import 'server-only';
import { readFile } from 'node:fs/promises';

/** Font and icon drawn into the image of the link preview, read once per server. */
export type PreviewAssets = {
  fonts: { name: string; data: Buffer; weight: 500 | 800; style: 'normal' }[];
  /** W of the logo, without its square (it sits on the same blue), as a data URI. */
  icon: string;
};

let loading: Promise<PreviewAssets> | undefined;

/**
 * Plus Jakarta Sans 500 and 800 (OFL, src/assets/fonts) and the W of the logo
 * (public/brand/widoo-mark.svg: widoo-icon.svg without its blue square, whose blue differs a
 * little from the background of the preview). Referenced with `new URL(…, import.meta.url)` so that the build
 * copies them next to the server.
 */
export function loadPreviewAssets(): Promise<PreviewAssets> {
  loading ??= Promise.all([
    readFile(new URL('../assets/fonts/PlusJakartaSans_500Medium.ttf', import.meta.url)),
    readFile(new URL('../assets/fonts/PlusJakartaSans_800ExtraBold.ttf', import.meta.url)),
    readFile(new URL('../../public/brand/widoo-mark.svg', import.meta.url)),
  ]).then(([medium, extraBold, icon]) => ({
    fonts: [
      { name: 'Plus Jakarta Sans', data: medium, weight: 500, style: 'normal' },
      { name: 'Plus Jakarta Sans', data: extraBold, weight: 800, style: 'normal' },
    ],
    icon: `data:image/svg+xml;base64,${icon.toString('base64')}`,
  }));
  return loading;
}
