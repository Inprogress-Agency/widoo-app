import './globals.css';
import { SessionProvider } from '@/lib/auth/SessionProvider';
import { messages } from '@/messages/fr';
import { Toaster } from '@widoo/ui';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';

// Self-hosted at build time: no request to Google from the browser.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  // The weights of the board « Typographie » (wiki Ecrans › Admin web).
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: messages.app.title,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // Browser extensions write attributes on <html> before React loads: accepted on this element
    // only, its children are still checked.
    <html lang="fr" className={jakarta.variable} suppressHydrationWarning>
      <body className="bg-background font-sans text-body-s text-foreground antialiased">
        <SessionProvider>{children}</SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
