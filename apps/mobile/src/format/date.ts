import { dateFormat } from '../i18n/formats';

/** Day and time of the results kept offline: « 22 sept. » and « 14:02 », in local time. */
export function formatDayAndTime(timestamp: number): { day: string; time: string } {
  const date = new Date(timestamp);
  return {
    day: dateFormat({ day: 'numeric', month: 'short' }).format(date),
    time: dateFormat({ hour: '2-digit', minute: '2-digit' }).format(date),
  };
}
