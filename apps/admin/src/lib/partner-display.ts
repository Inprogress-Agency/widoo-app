const price = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' });

/** A monthly price excluding tax as the admin writes it: « 49,00 € HT »; null while unknown. */
export function monthlyPriceLabelOf(cents: number | null): string | null {
  return cents === null ? null : `${price.format(cents / 100)} HT`;
}

/** A day of the API (`2026-11-01`) as the admin writes it: « 1 nov. 2026 »; null when none. */
export function dayLabelOf(isoDay: string | null): string | null {
  return isoDay === null ? null : day.format(new Date(`${isoDay}T12:00:00Z`));
}

/** The cities of the routes of a partner, or null while it has none. */
export function citiesLabelOf(cityNames: readonly string[]): string | null {
  return cityNames.length === 0 ? null : cityNames.join(', ');
}
