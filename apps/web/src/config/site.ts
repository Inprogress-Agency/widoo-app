import { parseEnv } from './env';

/** Constants of the site, read from the environment (see `.env.example`). */
export const site = parseEnv({
  SITE_URL: process.env.SITE_URL,
  SITE_ALIAS_HOSTS: process.env.SITE_ALIAS_HOSTS,
  SITE_INDEXABLE: process.env.SITE_INDEXABLE,
  APP_STORE_URL: process.env.APP_STORE_URL,
  PLAY_STORE_URL: process.env.PLAY_STORE_URL,
});

/** Publisher of the app, named in the footer and the structured data. */
export const publisher = { name: 'Inprogress Agency' } as const;

/** Name of the app in the structured data and the browser tab. */
export const appName = 'Widoo';
