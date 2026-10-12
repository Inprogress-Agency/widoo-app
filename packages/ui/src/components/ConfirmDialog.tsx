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
};

/**
 * Confirmation of a destructive action (wiki Ecrans › Admin web, « Confirmation »): a window on
 * a veil, the only place where a button is red. Its fields are a form: required ones block the
 * confirmation by themselves.
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
}: ConfirmDialogProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onConfirm();
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(isNowOpen) => !isNowOpen && onCancel()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 m-auto flex h-fit max-h-full w-full max-w-dialog flex-col gap-16 overflow-y-auto rounded-block bg-popover p-24 shadow-floating">
          <div className="flex items-start justify-between gap-12">
            <DialogPrimitive.Title className="text-title-m">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label={closeLabel}
              className="flex size-32 shrink-0 items-center justify-center rounded-pill hover:bg-accent"
            >
              <XIcon aria-hidden className="size-16" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="text-body">
            {description}
          </DialogPrimitive.Description>
          <form onSubmit={handleSubmit} className="flex flex-col gap-16">
            {children}
            <div className="flex justify-end gap-8">
              <Button variant="secondary" onClick={onCancel}>
                {cancelLabel}
              </Button>
              <Button type="submit" variant="destructive" disabled={isBusy}>
                {confirmLabel}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
