import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

/**
 * Buttons of the web interfaces (wiki Ecrans › Admin web, « Formes et tailles »): pills of 36 px,
 * 32 px small, 44 px on the sign-in page. `destructive` is kept for the confirmation that repeats
 * the action; elsewhere a destructive action opens with `destructiveOutline`.
 */
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-8 whitespace-nowrap rounded-pill transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-blue-ink',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-line',
        outline: 'border border-input bg-background text-foreground hover:bg-accent',
        ghost: 'text-foreground hover:bg-accent',
        destructive: 'bg-destructive text-destructive-foreground',
        destructiveOutline: 'border border-destructive bg-background text-destructive',
      },
      size: {
        small: 'min-h-32 px-12 text-label-strong',
        medium: 'min-h-chip-h px-16 text-control',
        large: 'min-h-touch-min px-20 text-button',
      },
    },
    defaultVariants: { variant: 'primary', size: 'medium' },
  },
);

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Renders the child (a link) with the look of the button instead of a `button`. */
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type = 'button',
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  return (
    <Component
      className={cn(buttonVariants({ variant, size }), className)}
      type={asChild ? undefined : type}
      {...props}
    />
  );
}
