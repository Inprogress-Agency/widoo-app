import { adminLateAfterHours } from '@widoo/shared';

// Wiki Admin-Web › Modèles communs: relative up to 7 days, then absolute; Paris time.
const timeZone = 'Europe/Paris';
const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;
const relativeForDays = 7;

const absoluteDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone });
const dayMonth = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone });
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

/** A day without its year, inside a sentence: « 2 octobre ». */
export function formatDayMonth(date: Date): string {
  return dayMonth.format(date);
}

/** A date in full, as a record shows it: « jeudi 9 octobre à 8:12 », Paris time. */
export function formatFullDate(date: Date): string {
  return fullDate.format(date);
}

/**
 * How long something has been waiting, as a queue shows it: « 20 min », « 9 h », « 1 j 22 h »,
 * « 3 j 4 h ».
 */
export function formatWaitingTime(since: Date, now = new Date()): string {
  const elapsed = Math.max(0, now.getTime() - since.getTime());
  if (elapsed < hour) {
    return `${Math.floor(elapsed / minute)} min`;
  }
  const hours = Math.floor((elapsed % day) / hour);
  if (elapsed < day) {
    return `${hours} h`;
  }
  const days = Math.floor(elapsed / day);
  return hours > 0 ? `${days} j ${hours} h` : `${days} j`;
}

/** A duration in minutes as a route shows it: « 45 min », « 7 h », « 4 h 30 ». */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const rest = minutes % 60;
  return rest > 0
    ? `${Math.floor(minutes / 60)} h ${String(rest).padStart(2, '0')}`
    : `${minutes / 60} h`;
}

/** True when something has been waiting since `since` for more than 72 hours (wiki Admin-Web). */
export function isWaitingLate(since: Date, now = new Date()): boolean {
  return now.getTime() - since.getTime() > adminLateAfterHours * hour;
}
