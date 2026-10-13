import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';

/** Above a sheet: the way back to its list. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-8 self-start text-control hover:underline"
    >
      <ArrowLeftIcon aria-hidden className="size-16" />
      {label}
    </Link>
  );
}
