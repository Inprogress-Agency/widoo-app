'use client';

import { locales, type SiteLocale } from '@/config/locales';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import { Fragment, type MouseEvent } from 'react';

const names: Record<SiteLocale, string> = { fr: 'Français', en: 'English' };

/** The same address in another language: the first segment of the path changes. */
export function pathInLocale(pathname: string, locale: SiteLocale): string {
  const rest = pathname.replace(/^\/(fr|en)(?=\/|$)/, '');
  return `/${locale}${rest === '/' ? '' : rest}`;
}

/**
 * « FR | EN » (E-21): the current language in ink, the other one in grey, 44 px high to the touch;
 * each one opens the same page in its language, with the query of the address (the token of a
 * private link).
 */
export function LanguageSwitch({
  current,
  label,
  small,
}: {
  current: SiteLocale;
  label: string;
  /** 14 px, in the footer. */
  small?: boolean;
}) {
  const bold = small ? 'text-credit-title' : 'text-button';
  const pathname = usePathname();
  function keepQuery(event: MouseEvent<HTMLAnchorElement>) {
    if (!window.location.search && !window.location.hash) return;
    event.preventDefault();
    window.location.assign(
      `${event.currentTarget.pathname}${window.location.search}${window.location.hash}`,
    );
  }
  return (
    <nav aria-label={label} className="flex items-center gap-6">
      {locales.map((locale, index) => (
        <Fragment key={locale}>
          {index > 0 && (
            <span aria-hidden className={clsx(bold, 'text-line')}>
              |
            </span>
          )}
          <a
            href={pathInLocale(pathname, locale)}
            hrefLang={locale}
            lang={locale}
            aria-label={names[locale]}
            aria-current={locale === current ? 'true' : undefined}
            onClick={keepQuery}
            // Each language keeps the room of its bold version: nothing moves when it changes.
            className="grid px-2 py-12 uppercase"
          >
            <span aria-hidden className={clsx('invisible col-start-1 row-start-1', bold)}>
              {locale}
            </span>
            <span
              className={clsx(
                'col-start-1 row-start-1 text-center',
                locale === current
                  ? [bold, 'text-ink']
                  : [small ? 'text-link-s' : 'text-body-semibold', 'text-muted'],
              )}
            >
              {locale}
            </span>
          </a>
        </Fragment>
      ))}
    </nav>
  );
}
