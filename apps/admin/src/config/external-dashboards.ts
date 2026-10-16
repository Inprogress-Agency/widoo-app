import { publicEnv } from './public-env';

/**
 * Dashboards kept outside the admin, linked from A-05. By default their home page, which opens
 * the project of the person once signed in: PostHog Cloud EU (wiki Securite-et-RGPD) and
 * RevenueCat. The environment can name the exact page of the Widoo project instead.
 */
export const externalDashboards = {
  posthog: publicEnv.NEXT_PUBLIC_POSTHOG_URL ?? 'https://eu.posthog.com',
  revenueCat: publicEnv.NEXT_PUBLIC_REVENUECAT_URL ?? 'https://app.revenuecat.com',
};
