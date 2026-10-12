import type { ComponentProps, KeyboardEvent } from 'react';
import { cn } from '../lib/cn';

/** A list as a table: header of 36 px, rows of 44 px separated by a line. */
export function Table({ className, ...props }: ComponentProps<'table'>) {
  return <table className={cn('w-full border-collapse text-left', className)} {...props} />;
}

/** Header cell of a column; `SortableColumnHeader` goes inside for a column that sorts. */
export function TableHeaderCell({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      scope="col"
      className={cn('h-chip-h px-12 text-column-head text-muted-foreground', className)}
      {...props}
    />
  );
}

type TableRowProps = Omit<ComponentProps<'tr'>, 'onClick' | 'onKeyDown' | 'tabIndex'> & {
  /** The row opens its record: it takes the focus, and Enter or Space opens it too. */
  onOpen?: () => void;
  /** The row whose record is open in the detail panel: blue ground. */
  isOpen?: boolean;
};

/** A row of the table, opened by a click or from the keyboard when `onOpen` is given. */
export function TableRow({ onOpen, isOpen = false, className, ...props }: TableRowProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onOpen?.();
    }
  };
  return (
    <tr
      tabIndex={onOpen ? 0 : undefined}
      aria-selected={onOpen ? isOpen : undefined}
      onClick={onOpen}
      onKeyDown={onOpen ? handleKeyDown : undefined}
      className={cn(
        'border-t border-border',
        onOpen && 'cursor-pointer',
        isOpen ? 'bg-blue-soft' : onOpen && 'hover:bg-secondary',
        className,
      )}
      {...props}
    />
  );
}

type TableCellProps = ComponentProps<'td'> & {
  /** The cell that names the row (a title, a subject): in 700. */
  isStrong?: boolean;
};

/** A cell of 44 px; add `truncate` and a width for a text that may be long. */
export function TableCell({ isStrong = false, className, ...props }: TableCellProps) {
  return (
    <td
      className={cn('h-touch-min px-12', isStrong ? 'text-control' : 'text-body-s', className)}
      {...props}
    />
  );
}
