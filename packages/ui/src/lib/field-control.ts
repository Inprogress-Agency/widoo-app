/**
 * Look shared by every field control (input, textarea, select): 10 px radius, control border,
 * red border when the value is refused (`aria-invalid`).
 */
export const fieldControlClasses =
  'w-full rounded-thumb border border-input bg-background px-12 text-body-s text-foreground placeholder:text-muted-foreground disabled:opacity-50 invalid:border-destructive';
