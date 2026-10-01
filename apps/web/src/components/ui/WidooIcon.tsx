import clsx from 'clsx';
import Image from 'next/image';

/**
 * Icon of the app (wiki › design-system/logo-widoo.svg, without its metadata): the W of the logo
 * on the blue square. Decorative: the name « Widoo » is always written next to it.
 */
export function WidooIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/widoo-icon.svg"
      alt=""
      aria-hidden
      width={44}
      height={44}
      unoptimized
      className={clsx('shrink-0', className)}
    />
  );
}
