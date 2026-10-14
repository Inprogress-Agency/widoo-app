import { z } from 'zod';
import { AppVersion } from './config';
import { multilineText, plainText } from './common';
import { AppLocale } from './me';

/** Subjects of « Nous écrire » (E-19, D-063), in the order of the chips; labels belong to the app. */
export const supportTopics = ['question', 'problem', 'data', 'other'] as const;
export const SupportTopic = z.enum(supportTopics);
export type SupportTopic = z.infer<typeof SupportTopic>;

/** Length of the message, counted by the app (« 81 sur 1000 »). */
export const supportMessageMaxLength = 1000;

/** An e-mail address the support answers to: trimmed, lower case kept as typed, 254 at most. */
export const ReplyEmail = z.string().trim().max(254).pipe(z.email());

/**
 * Body of `POST /support/messages`, with or without a token: the app joins its version and the
 * model of the phone (« La version de l'app et le modèle du téléphone sont joints »). Strict: an
 * unknown key is refused.
 */
export const SupportMessageInput = z.strictObject({
  topic: SupportTopic,
  message: multilineText(supportMessageMaxLength),
  /** Prefilled with the address of the account; required without one. */
  replyEmail: ReplyEmail,
  appVersion: AppVersion,
  /** « iPhone 15, iOS 18.2 ». */
  device: plainText(100),
  locale: AppLocale,
});
export type SupportMessageInput = z.infer<typeof SupportMessageInput>;

/** Body of a stored message: `201` of `POST /support/messages`. */
export const SupportMessageReceipt = z.object({ id: z.uuid(), createdAt: z.iso.datetime() });
export type SupportMessageReceipt = z.infer<typeof SupportMessageReceipt>;
