import { PageMessage } from '@/components/states/PageMessage';
import { messages } from '@/messages/fr';
import { Button } from '@widoo/ui';
import Link from 'next/link';

type AccessDeniedProps = {
  /** Where the person may go instead: the list this page belongs to. */
  backHref: string;
  backLabel: string;
};

/** A page the role of the member does not open: said plainly, with the way back. */
export function AccessDenied({ backHref, backLabel }: AccessDeniedProps) {
  return (
    <PageMessage
      role="alert"
      title={messages.accessDenied.title}
      text={messages.accessDenied.text}
      action={
        <Button asChild>
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      }
    />
  );
}
