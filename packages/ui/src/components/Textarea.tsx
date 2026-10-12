import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';
import { fieldControlClasses } from '../lib/field-control';

/** Text of several lines: a message to an author, the detail of a reason. */
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea className={cn(fieldControlClasses, 'min-h-textarea py-10', className)} {...props} />
  );
}
