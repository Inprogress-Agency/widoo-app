'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactElement, ReactNode } from 'react';

/** Once around the interface: tooltips opened one after the other show without delay. */
export const TooltipProvider = TooltipPrimitive.Provider;

type TooltipProps = {
  /** What the tooltip says; shown on hover and on keyboard focus of the child. */
  content: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** The element described, a button or a link. */
  children: ReactElement;
};

/** Label on dark ground next to an element, the same as the tooltips of the app. */
export function Tooltip({ content, side = 'right', children }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={8}
          className="z-50 rounded-thumb bg-surface-strong px-10 py-6 text-label text-on-strong shadow-floating"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
