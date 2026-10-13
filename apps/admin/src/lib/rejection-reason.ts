import { taxonomies, type RejectionReason } from '@widoo/shared';

/** True for one of the codified reasons: a select can also hold its empty first choice. */
export const isRejectionReason = (code: string): code is RejectionReason =>
  taxonomies.rejectionReasons.some((reason) => reason === code);
