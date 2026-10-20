import { z } from 'zod';
import { plainText } from './common';
import { RouteCard } from './route';

/** What kind of business a partner is (wiki Modele-de-Donnees › Admin web). */
export const b2bClientTypes = ['hotel', 'concierge', 'tourist_office', 'other'] as const;
export type B2bClientType = (typeof b2bClientTypes)[number];

/** Where a partner stands: `active` supposes a signed contract (wiki Admin-Web › A-10). */
export const b2bClientStatuses = ['prospect', 'active', 'suspended', 'ended'] as const;
export type B2bClientStatus = (typeof b2bClientStatuses)[number];

/** A partner chooses between 3 and 10 routes, in the order of its page. */
export const minPartnerRoutes = 3;
export const maxPartnerRoutes = 10;

/** Upper bound of a monthly price (excluding tax), in cents: a typing error, not a price. */
export const maxMonthlyPriceCents = 10_000_000;

/**
 * The slug of a partner: the end of its page address and of its measurement source. Lowercase
 * letters and digits, separated by single hyphens. It never changes once the partner exists: the
 * QR codes printed with it would stop measuring.
 */
export const B2bSlug = z
  .string()
  .min(3)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, digits and single hyphens only');

/** The source of measure of a partner, written in the links of its QR codes. */
export const b2bSourceOf = (slug: string) => `b2b-${slug}`;

/** A route a partner chose, at its place in the page. */
export const B2bClientRoute = z.object({
  id: z.uuid(),
  title: z.string(),
  /** From 0: the order of the page. */
  position: z.int().nonnegative(),
  /** Only a published route shows on the page of the partner. */
  isPublished: z.boolean(),
});
export type B2bClientRoute = z.infer<typeof B2bClientRoute>;

const listFields = {
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  type: z.enum(b2bClientTypes),
  status: z.enum(b2bClientStatuses),
  /** Monthly price excluding tax, in cents; null while unknown (a prospect). */
  monthlyPriceCents: z.int().nonnegative().nullable(),
  /** Start of the contract, a day; null until it is signed. */
  startedAt: z.iso.date().nullable(),
  /** The cities of the routes chosen: the data model gives a partner no city of its own. */
  cityNames: z.array(z.string()),
  routeCount: z.int().nonnegative(),
};

/** A partner as a row of the list (A-10). */
export const B2bClientListItem = z.object(listFields);
export type B2bClientListItem = z.infer<typeof B2bClientListItem>;

/** Body of `GET /admin/b2b-clients`: every partner, the active ones first. */
export const B2bClients = z.object({ items: z.array(B2bClientListItem) });
export type B2bClients = z.infer<typeof B2bClients>;

/** The card of a partner (A-10): the list fields, the contact, the notes and the routes chosen. */
export const B2bClient = z.object({
  ...listFields,
  contactName: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
  /** `b2b-<slug>`: what the page and the QR codes carry for the measure. */
  source: z.string(),
  routes: z.array(B2bClientRoute),
  createdAt: z.iso.datetime(),
});
export type B2bClient = z.infer<typeof B2bClient>;

const clientFields = {
  name: plainText(100),
  type: z.enum(b2bClientTypes),
  status: z.enum(b2bClientStatuses),
  contactName: plainText(100).nullable(),
  contactEmail: z.email().max(254).nullable(),
  contactPhone: plainText(30).nullable(),
  address: plainText(300).nullable(),
  monthlyPriceCents: z.int().min(0).max(maxMonthlyPriceCents).nullable(),
  startedAt: z.iso.date().nullable(),
  notes: plainText(2000).nullable(),
};

/** Body of `POST /admin/b2b-clients`: a prospect without a contact or a price unless said otherwise. */
export const B2bClientInput = z.strictObject({
  slug: B2bSlug,
  ...clientFields,
  status: clientFields.status.default('prospect'),
  contactName: clientFields.contactName.default(null),
  contactEmail: clientFields.contactEmail.default(null),
  contactPhone: clientFields.contactPhone.default(null),
  address: clientFields.address.default(null),
  monthlyPriceCents: clientFields.monthlyPriceCents.default(null),
  startedAt: clientFields.startedAt.default(null),
  notes: clientFields.notes.default(null),
});
export type B2bClientInput = z.infer<typeof B2bClientInput>;

/**
 * Body of `PATCH /admin/b2b-clients/:id`: the fields to change, at least one, never the slug.
 * Built from the fields without their defaults, so that a field left out stays as it is.
 */
export const B2bClientPatch = z
  .strictObject(clientFields)
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, { message: 'Give at least one field' });
export type B2bClientPatch = z.infer<typeof B2bClientPatch>;

/** Body of `PUT /admin/b2b-clients/:id/routes`: 3 to 10 different routes, in the order of the page. */
export const B2bClientRoutesInput = z.strictObject({
  routeIds: z
    .array(z.uuid())
    .min(minPartnerRoutes)
    .max(maxPartnerRoutes)
    .refine((ids) => new Set(ids).size === ids.length, { message: 'A route is chosen once' }),
});
export type B2bClientRoutesInput = z.infer<typeof B2bClientRoutesInput>;

/** `details` of a 409 `conflict` on a partner: what is wrong, read by the admin. */
export const b2bConflictReasons = ['slug_taken', 'routes_unavailable'] as const;
export type B2bConflictReason = (typeof b2bConflictReasons)[number];

/**
 * The page of a partner for the site (`GET /public/partners/:slug`, ticket #347): its name, the
 * routes it chose that are published, in order, as cards. Never its contact, price or notes. A
 * partner that is not active is served for a preview, and the site keeps it out of the search
 * engines; a suspended or ended one is a 404.
 */
export const PublicPartner = z.object({
  slug: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  routes: z.array(RouteCard),
});
export type PublicPartner = z.infer<typeof PublicPartner>;
