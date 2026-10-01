import { site } from '@/config/site';
import { readLocale } from '@/lib/i18n/messages';
import { localizedPath } from '@/lib/seo';
import { appDownloadTarget, readSource } from '@/lib/store-links';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * `/app` (Site-Web › Routes): the QR codes of the site and « Télécharger l'app » lead here, then
 * to the store of the phone, or to the home page on a computer. The answer depends on the
 * browser: never kept by a shared cache.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const locale = readLocale((await params).locale);
  const target = appDownloadTarget(
    request.headers.get('user-agent') ?? '',
    { appStoreUrl: site.APP_STORE_URL, playStoreUrl: site.PLAY_STORE_URL },
    localizedPath(locale, '/'),
    readSource(request.nextUrl.searchParams.get('src') ?? undefined),
  );
  const response = NextResponse.redirect(new URL(target, site.SITE_URL), 307);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Vary', 'User-Agent');
  return response;
}
