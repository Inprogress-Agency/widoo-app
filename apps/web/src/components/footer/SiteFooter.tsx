import { LanguageSwitch } from '@/components/header/LanguageSwitch';
import { SiteLogo } from '@/components/header/SiteLogo';
import type { SiteLocale } from '@/config/locales';
import { legalPaths } from '@/config/legal';
import { contactEmail, publisher } from '@/config/site';
import { fill } from '@/lib/i18n/fill';
import { localizedPath } from '@/lib/seo';
import type { Messages } from '@/messages';
import Link from 'next/link';

/**
 * Footer of the home page (E-21): logo, « © 2026 Inprogress Agency, conçu à Paris », the legal
 * pages (#242), the contact and FR | EN. Computer: one row; tablet: logo and languages, the links,
 * then the copyright; phone: logo, the links one under the other (44 px each to the touch), then
 * the copyright and the languages. In the code the logo, the links and the languages come in the
 * order of the keyboard (D-070); the grid lays them out.
 */
export function SiteFooter({
  locale,
  texts,
  headerTexts,
}: {
  locale: SiteLocale;
  texts: Messages['footer'];
  headerTexts: Messages['header'];
}) {
  const link = 'text-footer-link-phone text-ink md:text-link-s';
  return (
    <footer className="grid grid-cols-footer items-center gap-y-12 px-16 pb-gutter pt-24 md:gap-y-14 md:px-gutter md:pt-28 xl:flex xl:px-56">
      <div className="col-span-2 md:col-span-1 md:flex xl:order-1">
        <SiteLogo href={localizedPath(locale, '/')} label={headerTexts.home} small />
      </div>
      <p className="row-start-3 text-body-s text-muted md:col-span-2 xl:order-2 xl:ml-20 xl:mr-auto">
        {fill(texts.copyright, { publisher: publisher.name })}
      </p>
      <nav
        aria-label={texts.links}
        className="col-span-2 row-start-2 flex flex-col md:flex-row md:flex-wrap md:gap-24 xl:order-3 xl:gap-32"
      >
        <Link href={localizedPath(locale, legalPaths.terms[locale])} className={link}>
          {texts.terms}
        </Link>
        <Link href={localizedPath(locale, legalPaths.privacy[locale])} className={link}>
          {texts.privacy}
        </Link>
        <a href={`mailto:${contactEmail}`} className={link}>
          {contactEmail}
        </a>
      </nav>
      <div className="col-start-2 row-start-3 md:row-start-1 xl:order-4 xl:ml-gutter">
        <LanguageSwitch current={locale} label={headerTexts.language} small />
      </div>
    </footer>
  );
}
