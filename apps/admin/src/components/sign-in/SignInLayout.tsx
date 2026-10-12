import { WidooLogo } from '@/components/shell/WidooLogo';
import { messages } from '@/messages/fr';
import type { ReactNode } from 'react';

/** Page of A-01: warm gray, the logo, a white card of 440 px, then the line of help. */
export function SignInLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-28 bg-secondary p-16">
      <WidooLogo />
      <div className="flex w-full max-w-sign-in flex-col gap-20 rounded-block bg-card p-32">
        {children}
      </div>
      <p className="text-label text-muted-foreground">{messages.signIn.help}</p>
    </main>
  );
}
