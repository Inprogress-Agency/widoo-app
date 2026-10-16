'use client';

import { XIcon } from '@phosphor-icons/react/dist/ssr';
import { useEffect, useRef, type ReactNode } from 'react';

type DetailPanelProps = {
  /** Title of the record, also the name of the panel for screen readers. */
  title: string;
  /** Status badge above the title. */
  status?: ReactNode;
  /** Label of the close button: « Fermer ». */
  closeLabel: string;
  /** Closes the panel: the cross, or Escape. The caller gives the focus back to the row. */
  onClose: () => void;
  /** Actions pinned at the bottom of the panel. */
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * Detail of a record, 400 px on the right of its list, which stays in view (wiki Ecrans › Admin
 * web, « Panneau de détail »). It takes the focus when it opens; Escape closes it.
 */
export function DetailPanel({
  title,
  status,
  closeLabel,
  onClose,
  actions,
  children,
}: DetailPanelProps) {
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    panel.current?.focus();
  }, [title]);

  return (
    <aside
      ref={panel}
      tabIndex={-1}
      aria-label={title}
      onKeyDown={(event) => event.key === 'Escape' && onClose()}
      className="sticky top-0 flex max-h-detail-panel w-detail-panel shrink-0 flex-col gap-16 self-start border-l border-border p-24"
    >
      <header className="flex items-start justify-between gap-12">
        <div className="flex min-w-0 flex-col items-start gap-8">
          {status}
          <h2 className="text-title-m">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="flex size-chip-h shrink-0 items-center justify-center rounded-pill bg-secondary hover:bg-line"
        >
          <XIcon aria-hidden className="size-16" />
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-16 overflow-y-auto">{children}</div>
      {actions ? <footer className="flex flex-wrap gap-8">{actions}</footer> : null}
    </aside>
  );
}
