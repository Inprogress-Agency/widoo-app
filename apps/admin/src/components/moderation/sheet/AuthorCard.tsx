import { CertifiedSeal } from '@/components/moderation/CertifiedSeal';
import { sectionPaths } from '@/config/navigation';
import { messages } from '@/messages/fr';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr';
import type { ModerationRouteDetail } from '@widoo/shared';
import { InitialAvatar } from '@widoo/ui';
import Link from 'next/link';
import { SideCard } from './SideCard';

const texts = messages.moderation.sheet.author;
const monthAndYear = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Paris',
});

/**
 * The author of the route and what the team knows of them: routes published and refused, reports
 * received, registration, and the way to their account (A-06).
 */
export function AuthorCard({ author }: { author: NonNullable<ModerationRouteDetail['author']> }) {
  const name = author.firstName ?? messages.moderation.noAuthor;
  const lines: [string, string][] = [
    [texts.published, String(author.publishedRouteCount)],
    [texts.rejected, String(author.rejectedRouteCount)],
    [texts.reports, String(author.reportsReceivedCount)],
    [texts.registered, monthAndYear.format(new Date(author.registeredAt))],
  ];
  return (
    <SideCard title={texts.title}>
      <div className="flex items-center gap-12">
        <InitialAvatar name={name} large />
        <div className="flex flex-col">
          <p className="flex items-center gap-6 text-item">
            {name}
            {author.isCertified ? <CertifiedSeal /> : null}
          </p>
          {author.isCertified ? (
            <p aria-hidden className="text-label-strong text-blue-ink">
              {texts.certified}
            </p>
          ) : null}
        </div>
      </div>
      <dl className="flex flex-col gap-8">
        {lines.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-8 text-body-s">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      <Link
        href={`${sectionPaths.users}/${author.id}`}
        className="inline-flex items-center gap-6 text-control text-blue-ink hover:underline"
      >
        {texts.seeAccount}
        <CaretRightIcon aria-hidden className="size-16" />
      </Link>
    </SideCard>
  );
}
