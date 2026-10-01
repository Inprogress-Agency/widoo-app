import type { Icon } from '@phosphor-icons/react';

/**
 * A key figure of a route on one line: its icon, then its value (« 7 h », « ≈ 40 € »). `spoken`
 * replaces the value for screen readers when the written one reads badly (« ≈ »).
 */
export function KeyFact({ Icon, text, spoken }: { Icon: Icon; text: string; spoken?: string }) {
  return (
    <li className="flex items-center gap-6">
      <Icon aria-hidden className="size-icon-l text-blue-ink" />
      {spoken && <span className="sr-only">{spoken}</span>}
      <span aria-hidden={spoken ? true : undefined} className="text-item text-ink">
        {text}
      </span>
    </li>
  );
}
