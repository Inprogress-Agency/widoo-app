import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

const noticeVariants = cva('flex gap-10 rounded-photo p-12 text-body-s', {
  variants: {
    tone: {
      info: 'bg-blue-soft text-foreground',
      error: 'bg-error-soft text-error-ink',
    },
  },
});

type NoticeProps = Required<VariantProps<typeof noticeVariants>> & {
  /** Icon of the message, never the only sign of its tone: the text says it too. */
  icon?: ReactNode;
  /** `alert` interrupts a screen reader (a refusal, an error); `status` waits its turn. */
  role?: 'alert' | 'status';
  children: ReactNode;
  className?: string;
};

/** Framed message above a form or a list: an information on blue, a refusal or an error on red. */
export function Notice({ tone, icon, role = 'status', children, className }: NoticeProps) {
  return (
    <div role={role} className={cn(noticeVariants({ tone }), className)}>
      {icon}
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
