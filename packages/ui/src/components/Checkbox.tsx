import type { ComponentProps, ReactNode } from 'react';

type CheckboxProps = Omit<ComponentProps<'input'>, 'type' | 'children'> & {
  /** What is checked, clickable with the box. */
  label: ReactNode;
  /** Second line under the label, in gray. */
  description?: ReactNode;
};

/** A box to check with its label, on the checkbox of the browser tinted in the blue of Widoo. */
export function Checkbox({ label, description, ...props }: CheckboxProps) {
  return (
    <label className="flex cursor-pointer items-start gap-10">
      <input type="checkbox" className="mt-4 size-18 shrink-0 accent-primary" {...props} />
      <span className="flex flex-col">
        <span className="text-body-s text-foreground">{label}</span>
        {description ? (
          <span className="text-label text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
