'use client';

import {
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
  WarningIcon,
  XIcon,
} from '@phosphor-icons/react/dist/ssr';
import { Toaster as SonnerToaster } from 'sonner';

type ToasterProps = {
  /** Name of the button that closes an error, read by screen readers: « Fermer la notification ». */
  closeLabel: string;
};

/**
 * Where the toasts show (wiki Ecrans › Admin web, « Toast »): at the bottom, centered, one at a
 * time, on the dark ground of the toasts of the app. Rendered once, around the pages. An error,
 * which stays until the person acts, has a button to close it, on the right.
 */
export function Toaster({ closeLabel }: ToasterProps) {
  return (
    <SonnerToaster
      position="bottom-center"
      visibleToasts={1}
      toastOptions={{
        unstyled: true,
        closeButtonAriaLabel: closeLabel,
        classNames: {
          toast:
            'flex w-full items-center gap-12 rounded-pill bg-surface-strong px-16 py-10 text-on-strong shadow-floating',
          // The text takes the room left: the action and the close button stay on the right.
          content: 'min-w-0 flex-1',
          title: 'text-control',
          description: 'text-label text-on-strong-muted',
          actionButton: 'ml-auto rounded-pill bg-toast-action px-12 py-6 text-label-strong',
          // First in the toast for Sonner, last on screen; its focus ring is white on the dark ground.
          closeButton:
            'order-last flex size-24 shrink-0 items-center justify-center rounded-pill hover:bg-toast-action focus-visible:outline-on-strong',
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
        close: <XIcon aria-hidden className="size-16" />,
      }}
    />
  );
}
