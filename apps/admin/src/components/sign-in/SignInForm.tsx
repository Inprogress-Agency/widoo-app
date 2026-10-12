import { messages } from '@/messages/fr';
import { EnvelopeSimpleIcon } from '@phosphor-icons/react';
import { Button, Input, Label } from '@widoo/ui';
import Image from 'next/image';
import type { FormEvent, ReactNode } from 'react';

type SignInFormProps = {
  /** Messages above the choices: the page asked for, a refusal, an error. */
  notices: ReactNode;
  email: string;
  onEmailChange: (email: string) => void;
  onGoogle: () => void;
  onSendLink: () => void;
  /** An attempt is running: the choices wait for its answer. */
  isBusy: boolean;
};

/** A-01: « Continuer avec Google », or an address to receive a sign-in link. */
export function SignInForm({
  notices,
  email,
  onEmailChange,
  onGoogle,
  onSendLink,
  isBusy,
}: SignInFormProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSendLink();
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <h1 className="text-title-l">{messages.signIn.title}</h1>
        <p className="text-body text-muted-foreground">{messages.signIn.subtitle}</p>
      </div>
      {notices}
      <Button variant="outline" size="large" onClick={onGoogle} disabled={isBusy}>
        <Image src="/brand/google-g.svg" alt="" width={20} height={20} unoptimized />
        {messages.signIn.google}
      </Button>
      <p className="flex items-center gap-12 text-label text-muted-foreground">
        <span aria-hidden className="flex-1 border-t border-border" />
        {messages.signIn.or}
        <span aria-hidden className="flex-1 border-t border-border" />
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <Label htmlFor="sign-in-email">{messages.signIn.emailLabel}</Label>
        <Input
          id="sign-in-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          large
          placeholder={messages.signIn.emailPlaceholder}
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
        />
        <Button type="submit" size="large" disabled={isBusy} className="mt-10">
          <EnvelopeSimpleIcon aria-hidden className="size-18" />
          {messages.signIn.sendLink}
        </Button>
      </form>
    </>
  );
}
