import { messages } from '@/messages/fr';
import { Button } from '@widoo/ui';
import type { FormEvent, ReactNode } from 'react';
import { CodeField } from './CodeField';

type SecondFactorChallengeProps = {
  /** A refused code, above the field. */
  notices: ReactNode;
  code: string;
  onCodeChange: (code: string) => void;
  onSubmit: () => void;
  /** Gives up this sign-in to try another account. */
  onOtherAccount: () => void;
  isBusy: boolean;
};

/** After Google or the e-mail link: the code of the authenticator app, to finish signing in. */
export function SecondFactorChallenge({
  notices,
  code,
  onCodeChange,
  onSubmit,
  onOtherAccount,
  isBusy,
}: SecondFactorChallengeProps) {
  const texts = messages.signIn.challenge;
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <>
      <div className="flex flex-col gap-6">
        <h1 className="text-title-l">{texts.title}</h1>
        <p className="text-body text-muted-foreground">{texts.text}</p>
      </div>
      {notices}
      <form onSubmit={handleSubmit} className="flex flex-col gap-16">
        <CodeField id="second-factor-code" code={code} onCodeChange={onCodeChange} />
        <Button type="submit" size="large" disabled={isBusy}>
          {texts.submit}
        </Button>
      </form>
      <Button variant="ghost" size="large" onClick={onOtherAccount}>
        {messages.signIn.otherAccount}
      </Button>
    </>
  );
}
