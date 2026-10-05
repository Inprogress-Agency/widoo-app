import type { SiteLocale } from '@/config/locales';
import { storeBadges } from '@/config/store-badges';
import type { Messages } from '@/messages';
import clsx from 'clsx';
import Image from 'next/image';

type Props = {
  locale: SiteLocale;
  /** Text alternatives of the badges. */
  texts: Messages['stores'];
  appStoreUrl?: string;
  playStoreUrl?: string;
  /**
   * Only the arrangement changes, never the size. `hero`: side by side, stacked on the computer
   * (E-21 › Hero). `banner`: side by side on the phone, stacked from the tablet (E-21 › Bandeau
   * final). `row`: side by side, centred on the phone.
   */
  layout?: 'row' | 'hero' | 'banner';
  className?: string;
};

/**
 * App Store and Google Play badges (E-21): the official files of Apple and Google, in the language
 * of the page. Both badges have the same height, the same in every section: 44 px on the phone,
 * 48 px from the tablet; their width follows the proportions of each file, as Apple and Google
 * ask. A store without address is not shown.
 */
export function StoreBadges({
  locale,
  texts,
  appStoreUrl,
  playStoreUrl,
  layout = 'row',
  className,
}: Props) {
  const files = storeBadges[locale];
  const badges = [
    { url: appStoreUrl, label: texts.appStore, file: files.appStore },
    { url: playStoreUrl, label: texts.googlePlay, file: files.googlePlay },
  ].filter((badge): badge is typeof badge & { url: string } => badge.url !== undefined);
  if (badges.length === 0) return null;

  return (
    <ul
      className={clsx(
        'flex gap-12',
        layout === 'hero' && 'xl:flex-col xl:items-start',
        layout === 'banner' && 'md:flex-col md:items-start',
        layout === 'row' && 'max-md:justify-center',
        className,
      )}
    >
      {badges.map(({ url, label, file }) => (
        // On a narrow phone, a little smaller rather than on a second line.
        <li key={file.src}>
          <a href={url} className="block">
            <Image
              src={file.src}
              alt={label}
              width={file.width}
              height={file.height}
              unoptimized
              className="h-touch-min w-auto max-w-full object-contain object-left md:h-store-badge"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
