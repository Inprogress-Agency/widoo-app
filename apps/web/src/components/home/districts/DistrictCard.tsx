import type { Icon } from '@phosphor-icons/react';
import { MapPinIcon } from '@phosphor-icons/react/ssr';
import clsx from 'clsx';
import Link from 'next/link';

/**
 * A district of « Balades à Paris, quartier par quartier » (E-21): its photo or its icon, a pin,
 * its name and one line. Phone: the width of the plan; tablet: 324 px; computer: placed on the
 * plan of Paris (`place`). A link to the page `/r/` of its example route when the API gives one
 * (decision of Ilan of 2026-09-28). The photo is a light blue until the photos are chosen.
 */
export function DistrictCard({
  name,
  text,
  Icon,
  place,
  href,
}: {
  name: string;
  text: string;
  /** Shown instead of the photo (Saint-Germain-des-Prés, Quartier latin). */
  Icon?: Icon;
  /** Place and width on the computer. */
  place: string;
  href?: string;
}) {
  const content = (
    <>
      <span
        aria-hidden
        className="flex size-district-thumb shrink-0 items-center justify-center rounded-district-thumb bg-blue-soft xl:size-district-thumb-xl"
      >
        {Icon && <Icon weight="fill" className="size-district-icon text-blue-ink" />}
      </span>
      <div className="flex flex-col gap-2">
        <h4 className="flex items-center gap-6 text-title-card text-ink">
          <MapPinIcon aria-hidden weight="fill" className="size-icon-s shrink-0 text-blue" />
          {name}
        </h4>
        <p className="text-label text-muted">{text}</p>
      </div>
    </>
  );
  const card =
    'flex h-full items-center gap-12 rounded-section bg-bg py-8 pl-8 pr-14 shadow-district';
  return (
    <li className={clsx('md:w-district-tablet', place)}>
      {href ? (
        <Link href={href} className={card}>
          {content}
        </Link>
      ) : (
        <div className={card}>{content}</div>
      )}
    </li>
  );
}
