import { ArrowSquareOutIcon } from '@phosphor-icons/react/dist/ssr';

/** Link to a dashboard kept outside the admin (PostHog, RevenueCat), in a new tab. */
export function ExternalDashboardLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-6 text-control text-blue-ink hover:underline"
    >
      {label}
      <ArrowSquareOutIcon aria-hidden className="size-16" />
    </a>
  );
}
