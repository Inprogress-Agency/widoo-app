'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from '@phosphor-icons/react/dist/ssr';
import type { FormEvent, ReactNode } from 'react';
import { Button } from './Button';

type ConfirmDialogProps = {
  isOpen: boolean;
  /** Closing by the cross, Escape, the veil or « Annuler »: nothing is done. */
  onCancel: () => void;
  /** The form is valid and submitted: the caller does the action. */
  onConfirm: () => void;
  /** Question that names the action: « Fermer ce lieu ? ». */
  title: string;
  /** What the action does, in a sentence: the dialog always names the effect. */
  description: string;
  /** Fields of the confirmation, the reason first (`ReasonFields`). */
  children?: ReactNode;
  cancelLabel: string;
  closeLabel: string;
  /** Repeats the action: « Fermer le lieu », never « Confirmer ». */
  confirmLabel: string;
  /** The action is running: the buttons wait for its answer. */
  isBusy?: boolean;
  /** The fields do not allow the action yet (a choice not complete): the button waits. */
  isConfirmDisabled?: boolean;
  /**
   * `destructive` (default): the red button of an action that removes or refuses. `primary`: an
   * action that asks for a text without destroying anything (a message to an author).
   */
  confirmVariant?: 'destructive' | 'primary';
};

/**
 * Confirmation of an action that needs a reason or a message (wiki Ecrans › Admin web,
 * « Confirmation »): a window on a veil, the only place where a button is red. Its fields are a form: required ones block the
 * confirmation by themselves.
 *
 * The window never grows past the browser window: a long form (a B2B partner, the weights of a
 * setting) scrolls between the title and the buttons, which stay in view. A short one is laid out
 * as before, its height fitted to its content.
 */
export function ConfirmDialog({
  isOpen,
  onCancel,
  onConfirm,
  title,
  description,
  children,
  cancelLabel,
  closeLabel,
  confirmLabel,
  isBusy = false,
  isConfirmDisabled = false,
  confirmVariant = 'destructive',
}: ConfirmDialogProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onConfirm();
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(isNowOpen) => !isNowOpen && onCancel()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 m-auto flex h-fit max-h-dialog w-full max-w-dialog flex-col rounded-block bg-popover shadow-floating">
          <div className="flex shrink-0 items-start justify-between gap-12 px-24 pt-24">
            <DialogPrimitive.Title className="text-title-m">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label={closeLabel}
              className="flex size-32 shrink-0 items-center justify-center rounded-pill hover:bg-accent"
            >
              <XIcon aria-hidden className="size-16" />
            </DialogPrimitive.Close>
          </div>
          {/* The form holds the buttons, so that Enter in a field confirms; only its body scrolls,
              and brings a field reached with Tab fully into view, its focus ring included. */}
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
            <div className="flex min-h-0 scroll-py-16 flex-col gap-16 overflow-y-auto px-24 py-16">
              <DialogPrimitive.Description className="text-body">
                {description}
              </DialogPrimitive.Description>
              {children}
            </div>
            <div className="flex shrink-0 justify-end gap-8 px-24 pb-24">
              <Button variant="secondary" onClick={onCancel}>
                {cancelLabel}
              </Button>
              <Button type="submit" variant={confirmVariant} disabled={isBusy || isConfirmDisabled}>
                {confirmLabel}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
