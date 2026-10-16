'use client';

import * as MenuPrimitive from '@radix-ui/react-dropdown-menu';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;

/** Floating panel of a menu, under its trigger and aligned on its right edge by default. */
export function DropdownMenuContent({
  className,
  align = 'end',
  sideOffset = 8,
  ...props
}: ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 rounded-block bg-popover p-8 text-popover-foreground shadow-floating',
          className,
        )}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}

/** An action of a menu: a row as high as a button, highlighted under the pointer or the focus. */
export function DropdownMenuItem({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Item>) {
  return (
    <MenuPrimitive.Item
      className={cn(
        'flex min-h-chip-h cursor-pointer items-center gap-8 rounded-thumb px-12 text-control highlighted:bg-accent',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator() {
  return <MenuPrimitive.Separator className="my-8 border-t border-border" />;
}
