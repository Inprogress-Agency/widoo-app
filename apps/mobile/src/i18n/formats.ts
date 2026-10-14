import i18next from 'i18next';

/**
 * Locale of the dates and numbers of each language of the app: day before month and 24-hour
 * clock in both (« 22 sept., 14:02 », « 22 Sept, 14:02 »), comma or point before a decimal.
 */
const intlLocales = { fr: 'fr-FR', en: 'en-GB' } as const;

/** The `Intl` locale of the language shown now. */
export const intlLocale = (): string => intlLocales[i18next.language === 'en' ? 'en' : 'fr'];

const dateFormats = new Map<string, Intl.DateTimeFormat>();
const numberFormats = new Map<string, Intl.NumberFormat>();

function cached<T>(cache: Map<string, T>, options: object, create: (locale: string) => T): T {
  const locale = intlLocale();
  const key = `${locale} ${JSON.stringify(options)}`;
  let format = cache.get(key);
  if (!format) {
    format = create(locale);
    cache.set(key, format);
  }
  return format;
}

/** A date format in the language shown now, built once per language: a change applies at once. */
export const dateFormat = (options: Intl.DateTimeFormatOptions) =>
  cached(dateFormats, options, (locale) => new Intl.DateTimeFormat(locale, options));

/** A number format in the language shown now: « 4,2 » in French, « 4.2 » in English. */
export const numberFormat = (options: Intl.NumberFormatOptions = {}) =>
  cached(numberFormats, options, (locale) => new Intl.NumberFormat(locale, options));

/** « Samedi » from « samedi »; English weekdays and months already start with a capital. */
export const capitalize = (text: string) =>
  text.charAt(0).toLocaleUpperCase(intlLocale()) + text.slice(1);
