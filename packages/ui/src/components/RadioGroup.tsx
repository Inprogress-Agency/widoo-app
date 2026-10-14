import type { ComponentProps } from 'react';

export type RadioOption = {
  value: string;
  label: string;
  /** Second line under the label, in gray. */
  description?: string;
};

type RadioGroupProps = Omit<ComponentProps<'fieldset'>, 'onChange'> & {
  /** Name shared by the radios of the group. */
  name: string;
  /** Question of the group, read before each option. */
  legend: string;
  /** Marked with a red star; the radios carry `required`. */
  isRequired?: boolean;
  options: readonly RadioOption[];
  /** The chosen value; empty while none is chosen. */
  value: string;
  onChange: (value: string) => void;
};

/**
 * One choice among a few, each with its explanation, on the radio buttons of the browser tinted
 * in the blue of Widoo. Two columns once the window is wide enough.
 */
export function RadioGroup({
  name,
  legend,
  isRequired = false,
  options,
  value,
  onChange,
  ...props
}: RadioGroupProps) {
  return (
    <fieldset className="flex flex-col gap-8" {...props}>
      <legend className="pb-8 text-label-strong">
        {legend}
        {isRequired ? (
          <span aria-hidden className="text-destructive">
            {' *'}
          </span>
        ) : null}
      </legend>
      <div className="grid grid-cols-1 gap-x-16 gap-y-12 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-start gap-10">
            <input
              type="radio"
              name={name}
              value={option.value}
              required={isRequired}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mt-4 size-18 shrink-0 accent-primary"
            />
            <span className="flex flex-col">
              <span className="text-body-s text-foreground">{option.label}</span>
              {option.description ? (
                <span className="text-label text-muted-foreground">{option.description}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
