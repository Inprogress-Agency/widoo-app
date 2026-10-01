import { qrCodeSvg } from '@/lib/qr';
import { WidooIcon } from './WidooIcon';

/**
 * QR code of a link (E-21: the shared link on the computer, the hero and the final banner): the icon of the app in its centre, an image
 * with its text alternative, never focusable, drawn on the server.
 */
export async function QrLink({ link, label }: { link: string; label: string }) {
  const svg = await qrCodeSvg(link);
  return (
    <span className="relative block size-qr shrink-0 rounded-section bg-bg p-12">
      {/* A data URI, allowed by the CSP (`img-src data:`); next/image does not apply. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
        alt={label}
        className="size-full"
      />
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <WidooIcon className="size-avatar-s" />
      </span>
    </span>
  );
}
