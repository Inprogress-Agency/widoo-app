import { PageMessage } from '@/components/states/PageMessage';
import { messages } from '@/messages/fr';
import { Button } from '@widoo/ui';

type UnavailableMessageProps = {
  onRetry: () => void;
  /** Signs out, so that another account can sign in. */
  onOtherAccount: () => void;
};

/** The API did not answer when the account was read: try again, or use another account. */
export function UnavailableMessage({ onRetry, onOtherAccount }: UnavailableMessageProps) {
  return (
    <PageMessage
      role="alert"
      title={messages.signIn.errors.unavailable}
      action={
        <div className="flex flex-wrap justify-center gap-8">
          <Button onClick={onRetry}>{messages.signIn.retry}</Button>
          <Button variant="outline" onClick={onOtherAccount}>
            {messages.signIn.otherAccount}
          </Button>
        </div>
      }
    />
  );
}
