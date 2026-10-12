import { messages } from '@/messages/fr';
import { SealCheckIcon } from '@phosphor-icons/react/dist/ssr';

/** Blue seal next to the name of a certified creator (D-023), named for screen readers. */
export function CertifiedSeal() {
  return (
    <>
      <SealCheckIcon aria-hidden weight="fill" className="size-16 shrink-0 text-primary" />
      <span className="sr-only">, {messages.moderation.certified}</span>
    </>
  );
}
