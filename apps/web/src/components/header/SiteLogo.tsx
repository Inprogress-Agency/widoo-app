import Link from 'next/link';
import { WidooIcon } from '../ui/WidooIcon';

/** Logo of the site (E-21): the icon of the app and « widoo » in blue, back to the home page. */
export function SiteLogo({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} className="flex items-center gap-10">
      <WidooIcon className="size-avatar-m xl:size-step-dot-active" />
      <span aria-hidden className="text-wordmark text-blue xl:text-wordmark-l">
        widoo
      </span>
    </Link>
  );
}
