import { localeTags, type SiteLocale } from '@/config/locales';

/** Replaces the `{name}` placeholders of a text; a placeholder without value stays visible. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** Text for a count: `one` for 1 (and 0 in French), `other` otherwise, `{count}` filled. */
export function plural(
  count: number,
  forms: { one: string; other: string },
  locale: SiteLocale,
): string {
  const form =
    new Intl.PluralRules(localeTags[locale].lang).select(count) === 'one' ? 'one' : 'other';
  return fill(forms[form], { count });
}
