import { WidooIcon } from '@/components/ui/WidooIcon';
import Link from 'next/link';

/**
 * « Tout Paris est dans l'app » (E-21 › Quartiers): white pill with the icon of the app, at the
 * bottom of the plan; none on the phone. Leads to the final banner, like « Télécharger l'app » in
 * the header.
 */
export function AllParisLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex h-touch-min items-center gap-10 self-start rounded-pill bg-bg pl-8 pr-18 text-credit-title text-blue-ink shadow-app-link transition-transform duration-press active:scale-press max-md:hidden xl:absolute xl:bottom-28 xl:left-28"
    >
      <WidooIcon className="size-credit-logo" />
      {label}
    </Link>
  );
}
