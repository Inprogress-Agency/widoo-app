'use client';

import {
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
  WarningIcon,
} from '@phosphor-icons/react/dist/ssr';
import { Toaster as SonnerToaster } from 'sonner';

/**
 * Where the toasts show (wiki Ecrans › Admin web, « Toast »): at the bottom, centered, one at a
 * time, on the dark ground of the toasts of the app. Rendered once, around the pages.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      visibleToasts={1}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full items-center gap-12 rounded-pill bg-surface-strong px-16 py-10 text-on-strong shadow-floating',
          title: 'text-control',
          description: 'text-label text-on-strong-muted',
          actionButton: 'ml-auto rounded-pill bg-toast-action px-12 py-6 text-label-strong',
        },
      }}
      icons={{
        success: (
          <CheckCircleIcon aria-hidden weight="fill" className="size-20 text-success-on-strong" />
        ),
        info: <InfoIcon aria-hidden weight="fill" className="size-20 text-info-on-strong" />,
        warning: <WarningIcon aria-hidden weight="fill" className="size-20 text-amber" />,
        error: (
          <WarningCircleIcon aria-hidden weight="fill" className="size-20 text-error-on-strong" />
        ),
      }}
    />
  );
}
