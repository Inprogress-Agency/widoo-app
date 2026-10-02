import clsx from 'clsx';
import Link from 'next/link';
import { WidooIcon } from '../ui/WidooIcon';

/**
 * Logo of the site (E-21): the icon of the app and « widoo » in blue, back to the home page.
 * `small`: the one of the footer, 28 px.
 */
export function SiteLogo({ href, label, small }: { href: string; label: string; small?: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={clsx('flex items-center', small ? 'gap-8' : 'gap-9 xl:gap-10')}
    >
      <WidooIcon className={small ? 'size-credit-logo' : 'size-avatar-m xl:size-step-dot-active'} />
      <span
        aria-hidden
        className={clsx(
          'text-blue',
          small ? 'text-wordmark-s' : 'text-wordmark xl:text-wordmark-l',
        )}
      >
        widoo
      </span>
    </Link>
  );
}
