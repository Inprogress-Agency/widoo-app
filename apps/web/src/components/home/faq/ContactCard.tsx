import { WidooIcon } from '@/components/ui/WidooIcon';
import { EnvelopeSimpleIcon } from '@phosphor-icons/react/ssr';

/**
 * « Une autre question ? » (E-21 › Questions): blue card with the icon of the app, its text and
 * the address of the team as a white button that writes to it. Phone and computer: one under the
 * other; tablet: in one row, across the width (D-070).
 */
export function ContactCard({
  title,
  text,
  email,
}: {
  title: string;
  text: string;
  email: string;
}) {
  return (
    <div className="flex flex-col gap-14 rounded-contact bg-blue p-24 md:flex-row md:items-center md:gap-18 md:py-22 xl:flex-col xl:items-stretch xl:gap-14 xl:py-24">
      <WidooIcon className="size-avatar-l md:size-thumb xl:size-avatar-l" />
      <div className="flex flex-col gap-4 md:flex-1 xl:flex-none">
        <p className="text-contact-title text-on-blue">{title}</p>
        <p className="text-body-m text-on-blue">{text}</p>
      </div>
      <a
        href={`mailto:${email}`}
        className="flex h-touch-min shrink-0 items-center gap-8 self-start rounded-pill bg-bg px-18 text-button text-blue-ink transition-transform duration-press active:scale-press md:h-button-h md:self-center md:px-20 xl:h-touch-min xl:self-start xl:px-18"
      >
        <EnvelopeSimpleIcon aria-hidden weight="bold" className="size-contact-icon" />
        {email}
      </a>
    </div>
  );
}
