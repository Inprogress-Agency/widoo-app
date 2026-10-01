import type { SiteLocale } from './locales';

export type StoreBadge = { src: string; width: number; height: number };

/**
 * Official badges of the stores, unchanged as Apple and Google require (public/brand/badges):
 * App Store from Apple Marketing Tools (SVG), Google Play from the badge page of Google Play (PNG,
 * cropped to its border). Intrinsic sizes, for the proportions.
 */
export const storeBadges: Record<SiteLocale, { appStore: StoreBadge; googlePlay: StoreBadge }> = {
  fr: {
    appStore: { src: '/brand/badges/app-store-fr.svg', width: 126.5, height: 40 },
    googlePlay: { src: '/brand/badges/google-play-fr.png', width: 646, height: 192 },
  },
  en: {
    appStore: { src: '/brand/badges/app-store-en.svg', width: 119.7, height: 40 },
    googlePlay: { src: '/brand/badges/google-play-en.png', width: 564, height: 168 },
  },
};
