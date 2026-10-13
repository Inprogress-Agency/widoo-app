import type { PlaceHours } from '@widoo/shared';

/** The seven days of a week, Monday first, as `place_hours.weekday` numbers them. */
export const weekdays = [0, 1, 2, 3, 4, 5, 6] as const;

const slotPattern = /^([01]?\d|2[0-3])[:h]([0-5]\d)\s*[-–]\s*([01]?\d|2[0-3])[:h]([0-5]\d)$/;
const twoDigits = (value: string) => value.padStart(2, '0');

/**
 * The opening hours of a day as the team types them: « 9:00-12:30, 14:00-18:00 », nothing for a
 * closed day. Undefined when a slot cannot be read.
 */
export function parseDayHours(text: string): { opens: string; closes: string }[] | undefined {
  const slots: { opens: string; closes: string }[] = [];
  for (const part of text.split(',').map((slot) => slot.trim())) {
    if (part === '') {
      continue;
    }
    const match = slotPattern.exec(part);
    if (!match) {
      return undefined;
    }
    const [, openHour = '', openMinute = '', closeHour = '', closeMinute = ''] = match;
    slots.push({
      opens: `${twoDigits(openHour)}:${openMinute}`,
      closes: `${twoDigits(closeHour)}:${closeMinute}`,
    });
  }
  return slots;
}

/** The year-round hours of a place, one line of text per day, Monday first. */
export function hoursToDayTexts(hours: readonly PlaceHours[]): string[] {
  return weekdays.map((weekday) =>
    hours
      .filter(
        (slot) => slot.weekday === weekday && slot.validFrom === null && slot.validTo === null,
      )
      .map((slot) => `${slot.opens}-${slot.closes}`)
      .join(', '),
  );
}

/**
 * The hours to save from the seven lines of the form. Seasonal slots are not shown in the form:
 * they are kept as they were. Undefined when a line cannot be read.
 */
export function dayTextsToHours(
  dayTexts: readonly string[],
  previous: readonly PlaceHours[],
): PlaceHours[] | undefined {
  const seasonal = previous.filter((slot) => slot.validFrom !== null || slot.validTo !== null);
  const yearRound: PlaceHours[] = [];
  for (const weekday of weekdays) {
    const slots = parseDayHours(dayTexts[weekday] ?? '');
    if (!slots) {
      return undefined;
    }
    yearRound.push(...slots.map((slot) => ({ weekday, ...slot, validFrom: null, validTo: null })));
  }
  return [...yearRound, ...seasonal];
}
