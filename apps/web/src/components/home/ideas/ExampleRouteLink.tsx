import type { ExampleRouteDisplay } from '@/lib/ideas/display';
import Link from 'next/link';
import { CreatorBadge } from './CreatorBadge';

/**
 * The example route of a mood (E-21 › Envies): its creator, its title and « 3 h, 25 €, par
 * Camille », as a link to its page `/r/` (decision of Ilan of 2026-09-28, internal links for the
 * search engines).
 */
export function ExampleRouteLink({ href, route }: { href: string; route: ExampleRouteDisplay }) {
  return (
    <Link href={href} className="group mt-4 flex items-center gap-10 self-start">
      <CreatorBadge initial={route.authorInitial} />
      <span className="flex flex-col">
        <span className="text-credit-title text-ink group-hover:text-blue">{route.title}</span>
        <span className="text-label text-muted">{route.meta}</span>
      </span>
    </Link>
  );
}
