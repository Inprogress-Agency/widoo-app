import { PageMessage } from '@/components/states/PageMessage';
import { sectionPaths } from '@/config/navigation';
import { messages } from '@/messages/fr';
import { Button } from '@widoo/ui';
import Link from 'next/link';

export default function NotFound() {
  return (
    <PageMessage
      title={messages.notFound.title}
      text={messages.notFound.text}
      action={
        <Button asChild>
          <Link href={sectionPaths.dashboard}>{messages.notFound.back}</Link>
        </Button>
      }
    />
  );
}
