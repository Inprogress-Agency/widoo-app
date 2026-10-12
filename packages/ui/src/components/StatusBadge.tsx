import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-4 whitespace-nowrap rounded-pill px-8 py-4 text-column-head',
  {
    variants: {
      tone: {
        info: 'bg-blue-soft text-blue-ink',
        neutral: 'bg-secondary text-foreground',
        success: 'bg-green-soft text-green-ink',
        error: 'bg-error-soft text-error-ink',
        alert: 'bg-alert-soft text-alert',
        strong: 'bg-surface-strong text-on-strong',
      },
    },
  },
);

type StatusBadgeProps = Required<VariantProps<typeof statusBadgeVariants>> & {
  /** Icon of 16 px before the text; the text always says the status too. */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Status of a row or of a record, as a small pill: « En relecture », « Publié », « Refusé ». */
export function StatusBadge({ tone, icon, children, className }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ tone }), className)}>
      {icon}
      {children}
    </span>
  );
}
