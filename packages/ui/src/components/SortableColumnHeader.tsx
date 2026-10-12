import { ArrowDownIcon, ArrowUpIcon, CaretUpDownIcon } from '@phosphor-icons/react/dist/ssr';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export type SortDirection = 'asc' | 'desc';

type SortableColumnHeaderProps = {
  children: ReactNode;
  /** Direction when the list is sorted by this column; null when it is sorted by another one. */
  direction: SortDirection | null;
  /** Sorts by this column, or reverses its direction. */
  onSort: () => void;
};

/**
 * Button inside the header cell of a column that sorts: an arrow on the sorted column, two
 * carets on the others. The cell itself carries `aria-sort`.
 */
export function SortableColumnHeader({ children, direction, onSort }: SortableColumnHeaderProps) {
  const Icon =
    direction === 'asc' ? ArrowUpIcon : direction === 'desc' ? ArrowDownIcon : CaretUpDownIcon;
  return (
    <button
      type="button"
      onClick={onSort}
      className={cn('inline-flex items-center gap-4', direction && 'text-foreground')}
    >
      {children}
      <Icon aria-hidden className="size-16" />
    </button>
  );
}
