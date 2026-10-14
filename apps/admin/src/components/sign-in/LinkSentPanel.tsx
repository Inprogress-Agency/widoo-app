import { messages } from '@/messages/fr';
import { Button } from '@widoo/ui';
import type { ReactNode } from 'react';

type LinkSentPanelProps = {
  /** A failed resend, above the text. */
  notices: ReactNode;
  email: string;
  /** Seconds before the link may be sent again; 0 once allowed. */
  secondsLeft: number;
  onResend: () => void;
  onOtherAddress: () => void;
  isBusy: boolean;
};

/** A-01, « lien envoyé »: where the link went, when to ask again, or another address. */
export function LinkSentPanel({
  notices,
  email,
  secondsLeft,
  onResend,
  onOtherAddress,
  isBusy,
}: LinkSentPanelProps) {
  const texts = messages.signIn.linkSent;
  return (
    <>
      <h1 className="text-title-l">{texts.title}</h1>
      {notices}
      <p className="text-body text-muted-foreground">
        {texts.sentTo} <strong className="font-bold text-foreground">{email}</strong>.{' '}
        {texts.openHere}
      </p>
      <p className="text-body-s text-muted-foreground">{texts.expiry}</p>
      <div className="flex flex-col gap-8">
        <Button
          variant="outline"
          size="large"
          onClick={onResend}
          disabled={isBusy || secondsLeft > 0}
        >
          {secondsLeft > 0 ? texts.resendIn(secondsLeft) : texts.resend}
        </Button>
        <Button variant="ghost" size="large" onClick={onOtherAddress}>
          {texts.otherAddress}
        </Button>
      </div>
    </>
  );
}
