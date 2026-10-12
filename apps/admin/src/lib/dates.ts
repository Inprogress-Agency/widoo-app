// Wiki Admin-Web › Modèles communs: relative up to 7 days, then absolute; Paris time.
const timeZone = 'Europe/Paris';
const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;
const relativeForDays = 7;

const absoluteDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone });
const fullDate = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: 'numeric',
  minute: '2-digit',
  timeZone,
});

/**
 * A date as a list shows it: « à l'instant », « il y a 12 min », « il y a 6 h », « hier »,
 * « il y a 3 j », then the date (« 9 oct. 2026 ») after 7 days.
 */
export function formatRelativeDate(date: Date, now = new Date()): string {
  const elapsed = now.getTime() - date.getTime();
  if (elapsed < minute) {
    return "à l'instant";
  }
  if (elapsed < hour) {
    return `il y a ${Math.floor(elapsed / minute)} min`;
  }
  if (elapsed < day) {
    return `il y a ${Math.floor(elapsed / hour)} h`;
  }
  if (elapsed < 2 * day) {
    return 'hier';
  }
  if (elapsed < relativeForDays * day) {
    return `il y a ${Math.floor(elapsed / day)} j`;
  }
  return absoluteDate.format(date);
}

/** A date in full, as a record shows it: « jeudi 9 octobre à 8:12 », Paris time. */
export function formatFullDate(date: Date): string {
  return fullDate.format(date);
}
