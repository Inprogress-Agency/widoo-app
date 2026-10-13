import { messages } from '@/messages/fr';
import { Button } from '@widoo/ui';
import Image from 'next/image';
import type { FormEvent, ReactNode } from 'react';
import { CodeField } from './CodeField';

type TotpEnrollmentProps = {
  /** A refused code or a failed preparation, above the steps. */
  notices: ReactNode;
  /** The QR code as an image address, and the same secret as text; null while being prepared. */
  setup: { qrCodeImage: string; secretKey: string } | null;
  code: string;
  onCodeChange: (code: string) => void;
  onSubmit: () => void;
  onOtherAccount: () => void;
  isBusy: boolean;
};

/**
 * First sign-in of a member of the team: add the account to an authenticator app by its QR code
 * or its key, then prove it with a first code (D-087).
 */
export function TotpEnrollment({
  notices,
  setup,
  code,
  onCodeChange,
  onSubmit,
  onOtherAccount,
  isBusy,
}: TotpEnrollmentProps) {
  const texts = messages.signIn.enrollment;
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <>
      <div className="flex flex-col gap-6">
        <h1 className="text-title-l">{texts.title}</h1>
        <p className="text-body-s text-muted-foreground">{texts.text}</p>
      </div>
      {notices}
      {setup ? (
        <div className="flex flex-col gap-10">
          <p className="text-label-strong">{texts.scan}</p>
          <Image
            src={setup.qrCodeImage}
            alt={texts.qrCodeAlt}
            width={176}
            height={176}
            unoptimized
            className="self-center rounded-thumb border border-border"
          />
          <p className="text-label text-muted-foreground">{texts.manual}</p>
          <code className="break-all rounded-thumb bg-secondary px-12 py-8 text-body-s">
            {setup.secretKey}
          </code>
          <p className="text-label text-muted-foreground">{texts.keepSecret}</p>
        </div>
      ) : (
        <p role="status" className="text-body-s text-muted-foreground">
          {texts.preparing}
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-16">
        <p className="text-label-strong">{texts.enter}</p>
        <CodeField id="enrollment-code" code={code} onCodeChange={onCodeChange} />
        <Button type="submit" size="large" disabled={isBusy || !setup}>
          {texts.submit}
        </Button>
      </form>
      <Button variant="ghost" size="large" onClick={onOtherAccount}>
        {messages.signIn.otherAccount}
      </Button>
    </>
  );
}
