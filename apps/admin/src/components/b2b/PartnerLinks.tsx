import { messages } from '@/messages/fr';
import type { B2bClientStatus } from '@widoo/shared';

const texts = messages.b2b.links;

export type PartnerLink = {
  /** What the link opens: « Page du partenaire », « Application ». */
  label: string;
  url: string;
  /** The QR code of the link as an image; null while it is drawn. */
  qrCodeImage: string | null;
  fileName: string;
};

type PartnerLinksProps = {
  /** Null when the origin of the site is not set: there is nothing to link to. */
  links: PartnerLink[] | null;
  status: B2bClientStatus;
};

/** The links and QR codes of a partner (A-10): its page, and the stores with its source of measure. */
export function PartnerLinks({ links, status }: PartnerLinksProps) {
  return (
    <section className="flex flex-col gap-8">
      <h3 className="text-label-strong">{texts.title}</h3>
      {links === null ? (
        <p className="text-body-s text-muted-foreground">{texts.siteUrlMissing}</p>
      ) : (
        <>
          <p className="text-label text-muted-foreground">{texts.pageHint[status]}</p>
          <ul className="flex flex-col gap-16">
            {links.map((link) => (
              <li key={link.url} className="flex items-start gap-12">
                {link.qrCodeImage ? (
                  // The QR code is a `data:` image of our own: nothing to optimise or to fetch.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={link.qrCodeImage}
                    alt={texts.qrCodeOf(link.label)}
                    className="h-qr w-qr shrink-0 rounded-photo"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="h-qr w-qr shrink-0 animate-pulse rounded-photo bg-skeleton"
                  />
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-4 text-body-s">
                  <span className="text-label-strong">{link.label}</span>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-blue-ink underline"
                  >
                    {link.url}
                  </a>
                  {link.qrCodeImage ? (
                    <a
                      href={link.qrCodeImage}
                      download={link.fileName}
                      className="text-blue-ink underline"
                    >
                      {texts.download}
                    </a>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
