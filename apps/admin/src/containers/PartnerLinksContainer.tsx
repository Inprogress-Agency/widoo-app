'use client';

import { PartnerLinks } from '@/components/b2b/PartnerLinks';
import { publicEnv } from '@/config/public-env';
import { useQrCode } from '@/hooks/useQrCode';
import { partnerAppUrl, partnerPageUrl } from '@/lib/partner-links';
import { messages } from '@/messages/fr';
import type { B2bClient } from '@widoo/shared';

const texts = messages.b2b.links;

/** The links and QR codes of the card of a partner (A-10): the page, and the stores with its source. */
export function PartnerLinksContainer({ partner }: { partner: B2bClient }) {
  const siteUrl = publicEnv.NEXT_PUBLIC_SITE_URL ?? null;
  const pageUrl = siteUrl && partnerPageUrl(siteUrl, partner.slug);
  const appUrl = siteUrl && partnerAppUrl(siteUrl, partner.slug);
  const pageQrCode = useQrCode(pageUrl);
  const appQrCode = useQrCode(appUrl);

  return (
    <PartnerLinks
      status={partner.status}
      links={
        pageUrl && appUrl
          ? [
              {
                label: texts.page,
                url: pageUrl,
                qrCodeImage: pageQrCode,
                fileName: `qr-${partner.slug}-page.png`,
              },
              {
                label: texts.app,
                url: appUrl,
                qrCodeImage: appQrCode,
                fileName: `qr-${partner.slug}-app.png`,
              },
            ]
          : null
      }
    />
  );
}
