import { DownloadSimpleIcon } from '@phosphor-icons/react/ssr';
import Link from 'next/link';

/**
 * « Télécharger l'app » (E-21): blue pill, the icon in a lighter disc on its right. Leads to the
 * final banner of the home page, with the stores and the QR code (Site-Web › Header). With the mouse only,
 * the icon moves down 2 px on hover (E-21 › Mouvement). As wide as on the mockups in every
 * language: the header does not move when the language changes.
 */
export function DownloadButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group flex h-touch-min w-download-button items-center justify-between gap-12 whitespace-nowrap rounded-pill bg-blue pl-22 pr-6 text-button text-on-blue transition-transform duration-press active:scale-press xl:h-button-h xl:w-download-button-l"
    >
      {label}
      <span
        aria-hidden
        className="flex size-avatar-m items-center justify-center rounded-pill bg-on-blue/20 xl:size-download-disc"
      >
        <DownloadSimpleIcon
          weight="bold"
          className="size-icon-s transition-transform duration-press hover-hover:group-hover:translate-y-nudge"
        />
      </span>
    </Link>
  );
}
