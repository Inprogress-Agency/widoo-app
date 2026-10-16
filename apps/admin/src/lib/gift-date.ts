/** `AAAA-MM-JJ` of a date in local time (the team works on Paris time). */
function dayOf(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${dayOfMonth}`;
}

/** The first day a Premium gift may end on: tomorrow. */
export function earliestGiftDay(now = new Date()): string {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dayOf(tomorrow);
}

/** The end of a day chosen in the date field, as the API reads it: the last second of the day. */
export function endOfGiftDay(day: string): string {
  return new Date(`${day}T23:59:59`).toISOString();
}
