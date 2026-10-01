import type { SiteLocale } from '@/config/locales';
import { localizedPath } from '@/lib/seo';
import type { Messages } from '@/messages';
import { DownloadButton } from './DownloadButton';
import { LanguageSwitch } from './LanguageSwitch';
import { SiteLogo } from './SiteLogo';
import { SkipLink } from './SkipLink';

/**
 * Header of every page (E-21, D-070), measured on the mockups. Computer: logo, the links to the
 * sections of the home page centred on the page, FR | EN and « Télécharger l'app ». Tablet: no
 * links. Phone: logo and FR | EN. « Aller au contenu » comes first, shown on focus only.
 */
export function SiteHeader({ locale, texts }: { locale: SiteLocale; texts: Messages['header'] }) {
  const home = localizedPath(locale, '/');
  const sections = [
    { id: 'idees', label: texts.nav.ideas },
    { id: 'quartiers', label: texts.nav.districts },
    { id: 'questions', label: texts.nav.questions },
  ];
  return (
    <header className="relative flex h-header items-center justify-between px-16 md:h-header-tablet md:px-24 xl:h-header-desktop xl:px-gutter">
      {/* « Aller au contenu » first for the keyboard, drawn after the logo. */}
      <div className="flex items-center gap-32">
        <SkipLink label={texts.skip} />
        <div className="-order-1">
          <SiteLogo href={home} label={texts.home} />
        </div>
      </div>
      <nav
        aria-label={texts.sections}
        className="absolute left-1/2 hidden -translate-x-1/2 xl:flex"
      >
        {sections.map((section) => (
          <a
            key={section.id}
            href={`${home}#${section.id}`}
            className="px-20 text-body-medium text-ink"
          >
            {section.label}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-20 xl:gap-24">
        <LanguageSwitch current={locale} label={texts.language} />
        <div className="hidden md:block">
          <DownloadButton href={localizedPath(locale, '/app')} label={texts.download} />
        </div>
      </div>
    </header>
  );
}
