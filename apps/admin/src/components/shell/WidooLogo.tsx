import { messages } from '@/messages/fr';
import Image from 'next/image';

/**
 * Logo of the admin: the icon of the app, then « Widoo » and « Admin ». `isIconOnly` in the
 * reduced menu, where the name stays for screen readers.
 */
export function WidooLogo({ isIconOnly = false }: { isIconOnly?: boolean }) {
  return (
    <span className="flex items-center gap-10">
      <Image
        src="/brand/widoo-icon.svg"
        alt=""
        width={32}
        height={32}
        unoptimized
        className="size-avatar-m shrink-0 rounded-thumb"
      />
      <span className={isIconOnly ? 'sr-only' : 'flex flex-col'}>
        <span className="text-item">{messages.app.name}</span>
        <span className="text-caption text-muted-foreground">{messages.app.product}</span>
      </span>
    </span>
  );
}
