import type { Icon } from '@phosphor-icons/react';

/**
 * A key figure of a route in a tile: small icon, value, then what it is (« Durée »). `spoken`
 * replaces the value for screen readers when the written one reads badly (« ≈ »).
 */
export function KeyFigureTile({
  Icon,
  value,
  label,
  spoken,
}: {
  Icon: Icon;
  value: string;
  label: string;
  spoken?: string;
}) {
  return (
    // 69 px high on the mockups of the tablet and the computer: small icon, value under it.
    <li className="flex flex-col rounded-block bg-surface px-12 py-8 xl:px-8">
      <Icon aria-hidden className="size-icon-s text-ink" />
      {spoken && <span className="sr-only">{spoken}</span>}
      <span aria-hidden={spoken ? true : undefined} className="mt-4 text-number-m text-ink">
        {value}
      </span>
      <span className="text-caption text-muted">{label}</span>
    </li>
  );
}
