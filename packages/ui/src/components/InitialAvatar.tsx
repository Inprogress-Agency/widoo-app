import { cn } from '../lib/cn';

type InitialAvatarProps = {
  /** Name whose first letter is shown. */
  name: string;
  /** 32 px by default; 44 px with `large`. */
  large?: boolean;
  className?: string;
};

/** Round avatar with the initial of a person, on light blue. Decorative: the name is next to it. */
export function InitialAvatar({ name, large = false, className }: InitialAvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-pill bg-blue-soft text-blue-ink',
        large ? 'size-avatar-l text-item' : 'size-avatar-m text-label-strong',
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
