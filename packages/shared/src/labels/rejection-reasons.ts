import type { RejectionReason } from '../taxonomies';
import { fr } from './fr';

/**
 * Labels of the refusal reasons in both languages (wiki Creation-et-Moderation, D-087): the app
 * shows them to the author in its language (E-08), the admin in French (A-02). The other labels
 * only exist in French at the MVP.
 */
export const rejectionReasonLabels: Record<'fr' | 'en', Record<RejectionReason, string>> = {
  fr: fr.rejectionReasons,
  en: {
    not_a_route: 'Not a real route',
    place_invalid: 'Invalid place',
    description_insufficient: 'Description too thin',
    photos_invalid: 'Photos not allowed',
    promotional: 'Promotional content',
    policy_violation: 'Prohibited content',
    duplicate: 'Duplicate',
  },
};
