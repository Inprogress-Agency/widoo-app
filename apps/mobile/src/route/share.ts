/**
 * Public page of a route on the site (Site-Web, `/r/:id`), the link shared from the sheet. The
 * domain is the site's; its universal links reach the app with #241.
 */
const SITE_ORIGIN = 'https://widooapp.com';

export const routeShareUrl = (id: string) => `${SITE_ORIGIN}/r/${encodeURIComponent(id)}`;
