import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

/** Text field of 40 px (wiki Ecrans › Admin web, « Formes et tailles »); 44 px with `large`. */
export function Input({
  className,
  large = false,
  ...props
}: ComponentProps<'input'> & { large?: boolean }) {
  return (
    <input
      className={cn(
        'w-full rounded-thumb border border-input bg-background px-12 text-body-s text-foreground placeholder:text-muted-foreground disabled:opacity-50',
        large ? 'min-h-touch-min' : 'min-h-field',
        className,
      )}
      {...props}
    />
  );
}

/** Label of a field, tied to it by `htmlFor`. */
export function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('text-label-strong text-foreground', className)} {...props} />;
}
