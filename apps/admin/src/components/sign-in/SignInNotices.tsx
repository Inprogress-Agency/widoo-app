import type { SignInFailure } from '@/lib/auth/auth-client';
import type { SignInRefusal } from '@/lib/auth/session';
import { messages } from '@/messages/fr';
import { InfoIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { Notice } from '@widoo/ui';
import type { AdminSection } from '@widoo/shared';

type SignInNoticesProps = {
  /** The section asked for before signing in; null for the dashboard. */
  returnSection: AdminSection | null;
  refusal: SignInRefusal | null;
  failure: SignInFailure | null;
};

/**
 * Messages above the choices of A-01. A refusal or an error replaces the reminder of the page
 * asked for: one message at a time.
 */
export function SignInNotices({ returnSection, refusal, failure }: SignInNoticesProps) {
  const texts = messages.signIn;
  const errorIcon = <WarningCircleIcon aria-hidden weight="fill" className="size-20 shrink-0" />;

  if (refusal) {
    const { title, detail } = texts.refusals[refusal.reason];
    return (
      <Notice tone="error" role="alert" icon={errorIcon}>
        <p className="font-bold">{title}</p>
        {refusal.email ? <p>{refusal.email}</p> : null}
        {detail ? <p>{detail}</p> : null}
      </Notice>
    );
  }
  if (failure) {
    return (
      <Notice tone="error" role="alert" icon={errorIcon}>
        <p>{texts.errors[failure]}</p>
      </Notice>
    );
  }
  if (returnSection) {
    return (
      <Notice
        tone="info"
        icon={<InfoIcon aria-hidden className="size-20 shrink-0 text-blue-ink" />}
      >
        <p>{texts.returnTo(texts.returnTargets[returnSection])}</p>
      </Notice>
    );
  }
  return null;
}
