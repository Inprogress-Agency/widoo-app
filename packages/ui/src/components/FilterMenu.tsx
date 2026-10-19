'use client';

import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react/dist/ssr';
import { cn } from '../lib/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './DropdownMenu';

export type FilterMenuOption = { value: string; label: string };

type FilterMenuProps = {
  /** Name of the filter, shown while nothing is chosen: « Ville ». */
  label: string;
  options: readonly FilterMenuOption[];
  /** The value chosen, null without a choice. */
  value: string | null;
  /** Called with the option chosen, or null when the chosen one is picked again. */
  onChange: (value: string | null) => void;
};

/**
 * A filter with several choices, as a pill that opens a menu: « Ville », then « Lyon » on dark
 * ground once chosen. Picking the chosen option again removes the filter.
 */
export function FilterMenu({ label, options, value, onChange }: FilterMenuProps) {
  const chosen = options.find((option) => option.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={chosen ? `${label} : ${chosen.label}` : label}
        className={cn(
          'inline-flex min-h-32 items-center gap-6 rounded-pill px-12 text-control',
          chosen
            ? 'bg-surface-strong text-on-strong'
            : 'bg-secondary text-secondary-foreground hover:bg-line',
        )}
      >
        {chosen ? <CheckIcon aria-hidden className="size-16" /> : null}
        {chosen?.label ?? label}
        <CaretDownIcon aria-hidden className="size-16" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-menu overflow-y-auto">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => onChange(option.value === value ? null : option.value)}
          >
            <CheckIcon
              aria-hidden
              className={cn('size-16', option.value !== value && 'invisible')}
            />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
