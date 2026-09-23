import 'i18next';
import type { defaultNS, resources } from '.';

// Typed keys: `t('tabs.hme')` fails the typecheck instead of showing a key on screen.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)['fr'];
  }
}
