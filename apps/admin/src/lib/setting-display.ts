import { messages } from '@/messages/fr';
import type { AdminSetting, SettingValue } from '@widoo/shared';

const texts = messages.settings;
const numberFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });

/** A number as the settings page writes it: « 4,5 », « 10 000 ». */
export const formatSettingNumber = (value: number): string => numberFormat.format(value);

/** A value as the page shows it: a number with its unit, or each weight with its name. */
export function formatSettingValue(
  setting: Pick<AdminSetting, 'key'>,
  value: SettingValue,
): string {
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([name, weight]) => `${texts.weights[name] ?? name} ${formatSettingNumber(weight)}`)
      .join(' · ');
  }
  const unit = texts.items[setting.key]?.unit;
  return unit ? `${formatSettingNumber(value)} ${unit}` : formatSettingNumber(value);
}

/** The bounds of a setting in one phrase: « de 1 à 20 », « à partir de 0,1 ». */
export function boundsOf(setting: Pick<AdminSetting, 'min' | 'max'>): string {
  const min = formatSettingNumber(setting.min);
  return setting.max === null
    ? texts.panel.boundsFrom(min)
    : texts.panel.boundsRange(min, formatSettingNumber(setting.max));
}
