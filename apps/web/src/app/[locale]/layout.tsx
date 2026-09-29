import '../globals.css';
import { localeTags, locales } from '@/config/locales';
import { readLocale } from '@/lib/i18n/messages';
import { Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';

// Self-hosted at build time: no request to Google from the browser (Site-Web › Rendu et cache).
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '800'],
  display: 'swap',
  variable: '--font-jakarta',
});

/** Both languages are built ahead. The proxy sends every other address under one of them. */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = readLocale((await params).locale);
  return (
    // Browser extensions write attributes on <html> before React loads (LanguageTool,
    // translators): accepted on this element only, its children are still checked.
    <html lang={localeTags[locale].lang} className={jakarta.variable} suppressHydrationWarning>
      <body className="bg-bg font-sans font-medium text-ink antialiased">{children}</body>
    </html>
  );
}
