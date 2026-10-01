import { DownloadSimpleIcon } from '@phosphor-icons/react/ssr';

/**
 * « Télécharger l'app » (E-21): blue pill, the icon in a lighter disc on its right. Leads to
 * `/app`, which opens the store of the phone (the home page on a computer). With the mouse only,
 * the icon moves down 2 px on hover (E-21 › Mouvement). As wide as on the mockups in every
 * language: the header does not move when the language changes.
 */
export function DownloadButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="group flex h-touch-min w-download-button items-center justify-between gap-12 rounded-pill bg-blue pl-20 pr-6 text-button text-on-blue transition-transform duration-press active:scale-press xl:h-button-h xl:w-download-button-l"
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
    </a>
  );
}
