import { SiteFooter } from '@/components/footer/SiteFooter';
import { LegalArticle } from '@/components/legal/LegalArticle';
import { LegalSummary } from '@/components/legal/LegalSummary';
import type { SiteLocale } from '@/config/locales';
import { formatLongDate } from '@/lib/format';
import { fill } from '@/lib/i18n/fill';
import type { LegalText } from '@/lib/legal/types';
import type { Messages } from '@/messages';

/**
 * A legal page of the site (#242): the layout of E-21 without a dedicated mockup (comment of
 * Ilan), a column of text of 680 px at most under the header, then the footer. The title, the
 * date of the last change, « L'essentiel » when the text has one, then its articles, as the same
 * texts in the app (E-19).
 */
export function LegalContainer({
  locale,
  messages,
  text,
}: {
  locale: SiteLocale;
  messages: Messages;
  text: LegalText;
}) {
  const texts = messages.legal;
  return (
    <>
      <main id="contenu" className="px-16 pb-64 pt-48 md:px-gutter md:pb-96 md:pt-64 xl:pt-96">
        <article className="mx-auto flex max-w-legal flex-col gap-gutter">
          <header className="flex flex-col gap-12 md:gap-14 xl:gap-16">
            <h1 className="text-balance text-section-title text-ink md:text-section-title-l xl:text-section-title-xl">
              {text.title}
            </h1>
            <p className="text-lead-m text-muted">
              {fill(texts.updated, { date: formatLongDate(text.updatedAt, locale) })}
            </p>
          </header>
          {text.summary.length > 0 && (
            <LegalSummary title={texts.summary} sentences={text.summary} />
          )}
          {text.sections.map((section) => (
            <LegalArticle key={section.title} title={section.title} body={section.body} />
          ))}
        </article>
      </main>
      <SiteFooter locale={locale} texts={messages.footer} headerTexts={messages.header} />
    </>
  );
}
