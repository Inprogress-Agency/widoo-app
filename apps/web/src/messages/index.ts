import type { SiteLocale } from '@/config/locales';
import { en } from './en';
import { fr, type Messages } from './fr';

export type { Messages };

/** Texts by language. Read in server components with `getMessages`; keys in dot notation. */
export const messages: Record<SiteLocale, Messages> = { fr, en };
