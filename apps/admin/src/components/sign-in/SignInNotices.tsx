import type { SignInFailure } from '@/lib/auth/auth-client';
import type { SignInRefusal } from '@/lib/auth/session';
import { messages } from '@/messages/fr';
import { InfoIcon, WarningCircleIcon } from '@phosphor-icons/react/dist/ssr';
import { Notice } from '@widoo/ui';
import type { AdminSection } from '@widoo/shared';

type SignInNoticesProps = {
  /** The section asked for before signing in; null for the dashboard. */
  returnSection: AdminSection | null;
  refusal: SignInRefusal | null;
  failure: SignInFailure | null;
  /** The API ended the session: said first in the reminder of the page asked for. */
  hasExpired: boolean;
};

/**
 * Messages above the choices of A-01. A refusal or an error replaces the reminder of the page
 * asked for: one message at a time.
 */
export function SignInNotices({ returnSection, refusal, failure, hasExpired }: SignInNoticesProps) {
  const texts = messages.signIn;
  const errorIcon = <WarningCircleIcon aria-hidden weight="fill" className="size-20 shrink-0" />;

  if (refusal) {
    const { title, detail } = texts.refusals[refusal.reason];
    return (
      <Notice tone="error" role="alert" icon={errorIcon}>
        <p className="font-bold">{title}</p>
        {refusal.email ? <p>{texts.signedInAs(refusal.email)}</p> : null}
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
  if (returnSection || hasExpired) {
    return (
      <Notice
        tone="info"
        icon={<InfoIcon aria-hidden className="size-20 shrink-0 text-blue-ink" />}
      >
        {hasExpired ? <p className="font-bold">{texts.expired}</p> : null}
        <p>{texts.returnTo(texts.returnTargets[returnSection ?? 'dashboard'])}</p>
      </Notice>
    );
  }
  return null;
}
