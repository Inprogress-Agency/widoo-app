import { sectionPaths } from '@/config/navigation';
import { isRejectionReason } from '@/lib/rejection-reason';
import { messages } from '@/messages/fr';
import { labels, type AdminActionTargetType } from '@widoo/shared';

const texts = messages.actionLog;

/** The label of `key`, or the key itself when it has none: a name the admin does not know yet. */
const labelIn = (labelsByKey: Readonly<Record<string, string>>, key: string): string =>
  (Object.hasOwn(labelsByKey, key) ? labelsByKey[key] : undefined) ?? key;

/** An action as the journal reads it: its label, or its stable name when it has none yet. */
export const actionLabelOf = (action: string): string => labelIn(texts.actions, action);

/** A kind of target as the journal reads it. */
export const targetTypeLabelOf = (targetType: string): string =>
  labelIn(texts.targetTypes, targetType);

/**
 * Actions whose reason starts with the codified reason of a route (D-087), joined to the message
 * by the API (`decideRoute`): `not_a_route — Une liste de lieux sans enchaînement`.
 */
const actionsWithRouteReason = ['route.reject', 'route.unpublish'];
const reasonSeparator = ' — ';

/**
 * The reason of a line as the team reads it: a codified reason by its label (« Pas un vrai
 * parcours — … »), a reason written by hand as it is.
 */
export function reasonOf(action: { action: string; reason: string | null }): string | null {
  if (action.reason === null || !actionsWithRouteReason.includes(action.action)) {
    return action.reason;
  }
  const [code = '', ...message] = action.reason.split(reasonSeparator);
  return isRejectionReason(code)
    ? [labels.fr.rejectionReasons[code], ...message].join(reasonSeparator)
    : action.reason;
}

/**
 * Where the target of a line of the journal opens in the admin, or null for a kind without a page
 * of its own (a report is decided and leaves its list).
 */
export function targetPathOf(targetType: string, targetId: string): string | null {
  const id = encodeURIComponent(targetId);
  switch (targetType) {
    case 'route':
      return `${sectionPaths.catalog}/parcours/${id}`;
    case 'place':
      return `${sectionPaths.catalog}/lieux?lieu=${id}`;
    case 'user':
      return `${sectionPaths.users}?compte=${id}`;
    case 'setting':
      return `${sectionPaths.settings}?reglage=${id}`;
    default:
      return null;
  }
}

/**
 * What a line of the journal calls its target: the name the API found (first name, e-mail, title
 * of a route or of the route of a report or a rating, name of a place, a program or a partner),
 * the subject of a support message, the label of a setting, else null.
 */
export function targetNameOf(action: {
  targetType: string;
  targetId: string;
  targetLabel: string | null;
}): string | null {
  if (action.targetLabel) {
    // The API names a support message by its topic, labelled as in A-13.
    return action.targetType === 'support_message'
      ? labelIn(messages.users.topics, action.targetLabel)
      : action.targetLabel;
  }
  return action.targetType === 'setting'
    ? (messages.settings.items[action.targetId]?.label ?? null)
    : null;
}

/** Kinds of target the API names while they exist: without a name, the object is gone. */
const namedTargetTypes: readonly string[] = [
  'user',
  'route',
  'route_report',
  'rating',
  'place',
  'affiliate_program',
  'b2b_client',
  'support_message',
] satisfies AdminActionTargetType[];

/** True when the target of a line was deleted since: its page would open on nothing. */
export function isTargetGone(action: { targetType: string; targetLabel: string | null }): boolean {
  return namedTargetTypes.includes(action.targetType) && action.targetLabel === null;
}
