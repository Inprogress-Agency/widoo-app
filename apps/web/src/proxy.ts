import { site } from '@/config/site';
import { decideRouting } from '@/lib/routing';
import { NextResponse, type NextRequest } from 'next/server';

/** Canonical domain and language of the site; the decision itself is in `lib/routing.ts`. */
export function proxy(request: NextRequest) {
  const decision = decideRouting({
    host: request.headers.get('host'),
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    acceptLanguage: request.headers.get('accept-language'),
    siteUrl: site.SITE_URL,
    aliasHosts: site.SITE_ALIAS_HOSTS,
  });

  switch (decision.kind) {
    case 'next':
      return NextResponse.next();
    case 'rewrite':
      return NextResponse.rewrite(new URL(decision.pathname, request.url));
    case 'redirect': {
      const response = NextResponse.redirect(new URL(decision.location, request.url), {
        status: decision.status,
      });
      // The target depends on the browser: no shared cache may keep it.
      if (decision.negotiated) response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }
  }
}

export const config = {
  // Everything but the files of the build and the files with an extension (sitemap.xml,
  // robots.txt, icons, `/.well-known/…`).
  matcher: ['/((?!_next/|.*\\..*).*)'],
};
