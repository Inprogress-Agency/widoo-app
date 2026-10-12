import type { ReactNode } from 'react';

type PageMessageProps = {
  title: string;
  text?: string;
  /** The useful action: « Réessayer », a link back. */
  action?: ReactNode;
  /** `alert` for an error, announced at once; `status` for a wait. */
  role?: 'alert' | 'status';
};

/** A message alone in the middle of a page or of the window: wait, error, page not found. */
export function PageMessage({ title, text, action, role }: PageMessageProps) {
  return (
    <div
      role={role}
      className="flex h-full min-h-card-photo flex-col items-center justify-center gap-12 p-24 text-center"
    >
      <p className="text-title-s">{title}</p>
      {text ? <p className="text-body-s text-muted-foreground">{text}</p> : null}
      {action}
    </div>
  );
}
