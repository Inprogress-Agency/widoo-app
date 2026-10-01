import 'server-only';
import { colors } from '@widoo/tokens';
import QRCode from 'qrcode';

/**
 * QR code of a link, as an SVG drawn on the server: no JavaScript in the page. Ink on white,
 * margin left to the frame around it. Highest error correction (up to 30 % of the code can be
 * hidden): the icon of the app covers its centre (E-21).
 */
export function qrCodeSvg(link: string): Promise<string> {
  return QRCode.toString(link, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 0,
    color: { dark: colors.ink, light: colors.bg },
  });
}
