import { z } from 'zod';
import { linkOrigins } from '../booking-link';
import { HttpsUrl, plainText } from './common';

/** Rows of a page of the bookable steps of the admin. */
export const adminBookableStepsPageSize = 50;

/** Days a program may keep its cookie (the database holds the same bounds). */
export const maxCookieDays = 365;

/** A program of affiliation Widoo is registered with (A-09). */
export const AffiliateProgram = z.object({
  id: z.uuid(),
  name: z.string(),
  /** The network that runs it: « Awin », « Impact »... */
  network: z.string(),
  commissionNote: z.string().nullable(),
  cookieDays: z.int().min(0).max(maxCookieDays),
  isActive: z.boolean(),
  /** Places whose partner link names this program. */
  placeCount: z.int().nonnegative(),
  createdAt: z.iso.datetime(),
});
export type AffiliateProgram = z.infer<typeof AffiliateProgram>;

/** Body of `GET /admin/affiliate-programs`. */
export const AffiliatePrograms = z.object({ items: z.array(AffiliateProgram) });
export type AffiliatePrograms = z.infer<typeof AffiliatePrograms>;

const programFields = {
  name: plainText(100),
  network: plainText(100),
  commissionNote: plainText(200).nullable(),
  cookieDays: z.int().min(0).max(maxCookieDays),
  isActive: z.boolean(),
};

/** Body of `POST /admin/affiliate-programs`: active and without a note unless said otherwise. */
export const AffiliateProgramInput = z.strictObject({
  ...programFields,
  commissionNote: programFields.commissionNote.default(null),
  isActive: programFields.isActive.default(true),
});
export type AffiliateProgramInput = z.infer<typeof AffiliateProgramInput>;

/**
 * Body of `PATCH /admin/affiliate-programs/:id`: the fields to change, at least one. Built from
 * the fields without their defaults, so that a field left out stays as it is.
 */
export const AffiliateProgramPatch = z
  .strictObject(programFields)
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, { message: 'Give at least one field' });
export type AffiliateProgramPatch = z.infer<typeof AffiliateProgramPatch>;

/** Query of `GET /admin/bookable-steps`: the steps that can be booked, newest routes first. */
export const BookableStepsQuery = z.strictObject({
  /** Only the places without a partner link of Widoo: where to sign up first. */
  withoutPartnerLink: z.enum(['true']).optional(),
  cursor: z.string().max(200).optional(),
});
export type BookableStepsQuery = z.infer<typeof BookableStepsQuery>;

/** A step that can be booked, with the link it shows and the clicks it got over 30 days. */
export const BookableStep = z.object({
  stepId: z.uuid(),
  position: z.int().nonnegative(),
  route: z.object({ id: z.uuid(), title: z.string() }),
  place: z.object({ id: z.uuid(), name: z.string(), hasPartnerLink: z.boolean() }),
  /** The link shown and where it comes from; null when the step shows none. */
  link: z.object({ url: HttpsUrl, origin: z.enum(linkOrigins) }).nullable(),
  clicks30Days: z.int().nonnegative(),
});
export type BookableStep = z.infer<typeof BookableStep>;

/** Body of `GET /admin/bookable-steps`. */
export const BookableSteps = z.object({
  items: z.array(BookableStep),
  total: z.int().nonnegative(),
  /** Rows before this page: the first row shown is number `offset + 1`. */
  offset: z.int().nonnegative(),
  previousCursor: z.string().nullable(),
  nextCursor: z.string().nullable(),
});
export type BookableSteps = z.infer<typeof BookableSteps>;
