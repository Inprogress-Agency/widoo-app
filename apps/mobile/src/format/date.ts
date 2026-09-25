const day = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Day and time of the results kept offline: « 22 sept. » and « 14:02 », in local time. */
export function formatDayAndTime(timestamp: number): { day: string; time: string } {
  const date = new Date(timestamp);
  return { day: day.format(date), time: time.format(date) };
}
