import type { AdminSetting, SettingValue } from '@widoo/shared';

/**
 * What the edit window holds while it is open: one text per field, as typed. A number has the
 * single field `value`; the weights have one field per component.
 */
export type SettingFields = Record<string, string>;

const singleField = 'value';

/** A number as typed in France: « 0,3 ». */
const typed = (value: number): string => String(value).replace('.', ',');

/** The fields of the window, filled with the value in force. */
export function fieldsOf(setting: Pick<AdminSetting, 'value'>): SettingFields {
  const { value } = setting;
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([name, weight]) => [name, typed(weight)]));
  }
  return { [singleField]: typed(value) };
}

const numberOf = (text: string | undefined): number | null => {
  if (text === undefined || text.trim() === '') {
    return null;
  }
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
};

/**
 * The value the fields stand for, or null while one is empty or not a number. Bounds are not
 * checked here: the API holds each setting to its own.
 */
export function valueOfFields(
  setting: Pick<AdminSetting, 'value'>,
  fields: SettingFields,
): SettingValue | null {
  if (typeof setting.value !== 'object') {
    return numberOf(fields[singleField]);
  }
  const entries = Object.keys(setting.value).map((name) => [name, numberOf(fields[name])] as const);
  if (entries.some(([, weight]) => weight === null)) {
    return null;
  }
  return Object.fromEntries(entries) as Record<string, number>;
}
