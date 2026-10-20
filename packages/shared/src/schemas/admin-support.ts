import { z } from 'zod';
import { AppLocale } from './me';
import { SupportTopic } from './support';

/** Rows of a page of the support messages of the admin. */
export const adminSupportPageSize = 50;

/** Which messages the list shows: the ones still to answer, the handled ones, or both. */
export const adminSupportStatuses = ['unhandled', 'handled'] as const;

/** Query of `GET /admin/support` (A-13): every message unless a status is asked. */
export const AdminSupportQuery = z.strictObject({
  status: z.enum(adminSupportStatuses).optional(),
  cursor: z.string().max(200).optional(),
});
export type AdminSupportQuery = z.infer<typeof AdminSupportQuery>;

/** The account that wrote a message: null for a message sent without one. */
const SupportAuthor = z.object({ id: z.uuid(), firstName: z.string().nullable() }).nullable();

/** A row of the list of messages (A-13): the subject, the account, the date, the status. */
export const AdminSupportItem = z.object({
  id: z.uuid(),
  topic: SupportTopic,
  /** The beginning of the message, to tell the rows apart; the whole one is on the card. */
  preview: z.string(),
  author: SupportAuthor,
  createdAt: z.iso.datetime(),
  /** Null while the team has not handled it. */
  handledAt: z.iso.datetime().nullable(),
});
export type AdminSupportItem = z.infer<typeof AdminSupportItem>;

/** Body of `GET /admin/support`: the messages to handle first, the oldest first, then the others. */
export const AdminSupportMessages = z.object({
  items: z.array(AdminSupportItem),
  total: z.int().nonnegative(),
  /** Rows before this page: the first row shown is number `offset + 1`. */
  offset: z.int().nonnegative(),
  previousCursor: z.string().nullable(),
  nextCursor: z.string().nullable(),
});
export type AdminSupportMessages = z.infer<typeof AdminSupportMessages>;

/**
 * A message in full (A-13): what the user wrote, the address to answer to, and what the app
 * joined to help the support. Read by moderators and admins only.
 */
export const AdminSupportMessage = AdminSupportItem.omit({ preview: true }).extend({
  message: z.string(),
  /** The address the answer goes to: the one typed in the form, not always the one of the account. */
  replyEmail: z.string(),
  appVersion: z.string(),
  device: z.string(),
  /** Language of the app when the message was sent: the language of an answer. */
  locale: AppLocale,
});
export type AdminSupportMessage = z.infer<typeof AdminSupportMessage>;

/** `details` of a 409 `already_decided` on a message: when another member handled it. */
export const SupportAlreadyHandledDetails = z.object({ handledAt: z.iso.datetime() });
export type SupportAlreadyHandledDetails = z.infer<typeof SupportAlreadyHandledDetails>;
