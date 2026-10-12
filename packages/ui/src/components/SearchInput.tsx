import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';
import { Input } from './Input';

/** Search field of a list: a text field with the magnifying glass on its left. */
export function SearchInput({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <span className={cn('relative block', className)}>
      <MagnifyingGlassIcon
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-12 my-auto size-16 text-muted-foreground"
      />
      <Input type="search" className="pl-32" {...props} />
    </span>
  );
}
