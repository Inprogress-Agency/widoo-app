import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';
import { fieldControlClasses } from '../lib/field-control';

/**
 * Choice in a short list (a codified reason), on the list of the browser: keyboard and screen
 * readers work as everywhere else. Its options are `option` children.
 */
export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <span className="relative block">
      <select
        className={cn(fieldControlClasses, 'min-h-field appearance-none pr-32', className)}
        {...props}
      >
        {children}
      </select>
      <CaretDownIcon
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-12 my-auto size-16 text-foreground"
      />
    </span>
  );
}
