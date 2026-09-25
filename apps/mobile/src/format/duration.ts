import type { TFunction } from 'i18next';

/**
 * Duration of a route as written in the app (Direction-Artistique › Ton) : « 45 min », « 7 h »,
 * « 2 h 30 », never « Journée ». `spoken` is what a screen reader says: « 2 heures 30 ».
 */
export function formatDuration(t: TFunction, minutes: number, form: 'short' | 'spoken'): string {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (form === 'spoken') {
    if (hours === 0) {
      return t('duration.spoken.minutes', { count: rest });
    }
    return rest === 0
      ? t('duration.spoken.hours', { count: hours })
      : t('duration.spoken.hoursMinutes', { count: hours, minutes: rest });
  }
  if (hours === 0) {
    return t('duration.short.minutes', { minutes: rest });
  }
  return rest === 0
    ? t('duration.short.hours', { hours })
    : t('duration.short.hoursMinutes', { hours, minutes: String(rest).padStart(2, '0') });
}
