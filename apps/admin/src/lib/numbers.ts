const frenchNumber = new Intl.NumberFormat('fr-FR');

/** A count as the admin writes it, with the French thousands separator: « 2 140 ». */
export function formatCount(value: number): string {
  return frenchNumber.format(value);
}
