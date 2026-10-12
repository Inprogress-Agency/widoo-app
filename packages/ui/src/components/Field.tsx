import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr';
import type { ReactNode } from 'react';
import { Label } from './Input';

type FieldProps = {
  label: string;
  /** `id` of the control, which the label points to. */
  htmlFor: string;
  /** Marked with a red star; the control itself carries `required`. */
  isRequired?: boolean;
  /** Help under the control, tied to it by `aria-describedby={`${htmlFor}-hint`}`. */
  hint?: string;
  /** Why the value is refused; replaces the hint and is announced at once. */
  error?: string;
  /** The control: `Input`, `Textarea` or `Select`. */
  children: ReactNode;
};

/** A control with its label, its help and its error, stacked. */
export function Field({ label, htmlFor, isRequired = false, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-8">
      <Label htmlFor={htmlFor}>
        {label}
        {isRequired ? (
          <span aria-hidden className="text-destructive">
            {' *'}
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-hint`} role="alert" className="flex gap-6 text-label text-destructive">
          <WarningCircleIcon aria-hidden className="size-16 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-label text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
