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
  className?: string;
};

/**
 * App Store and Google Play badges (E-21): the official files of Apple and Google, in the language
 * of the page. On the phone, 44 px high, centred 12 px apart, the same margin on each side; from
 * the tablet, 42 px high side by side, as on the mockups. A store without address is not
 * shown.
 */
export function StoreBadges({ locale, texts, appStoreUrl, playStoreUrl, className }: Props) {
  const files = storeBadges[locale];
  const badges = [
    { url: appStoreUrl, label: texts.appStore, file: files.appStore },
    { url: playStoreUrl, label: texts.googlePlay, file: files.googlePlay },
  ].filter((badge): badge is typeof badge & { url: string } => badge.url !== undefined);
  if (badges.length === 0) return null;

  return (
    <ul className={clsx('flex gap-10 max-md:justify-center max-md:gap-12', className)}>
      {badges.map(({ url, label, file }) => (
        // Phone: centred 12 px apart, as on the mockup, a little smaller on a narrow screen
        // rather than on a second line.
        <li key={file.src} className="max-md:overflow-hidden">
          <a href={url} className="block max-md:max-w-full">
            <Image
              src={file.src}
              alt={label}
              width={file.width}
              height={file.height}
              unoptimized
              className="h-touch-min w-auto max-w-full object-contain md:h-store-badge"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
