import { sectionPaths } from '@/config/navigation';
import { messages } from '@/messages/fr';

const texts = messages.actionLog;

/** An action as the journal reads it: its label, or its stable name when it has none yet. */
export const actionLabelOf = (action: string): string => texts.actions[action] ?? action;

/** A kind of target as the journal reads it. */
export const targetTypeLabelOf = (targetType: string): string =>
  texts.targetTypes[targetType] ?? targetType;

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
 * of a route, name of a place), the label of a setting, else null.
 */
export function targetNameOf(action: {
  targetType: string;
  targetId: string;
  targetLabel: string | null;
}): string | null {
  if (action.targetLabel) {
    return action.targetLabel;
  }
  return action.targetType === 'setting'
    ? (messages.settings.items[action.targetId]?.label ?? null)
    : null;
}

/** Kinds of target the API names while they exist: without a name, the object is gone. */
const namedTargetTypes = ['user', 'route', 'place'];

/** True when the target of a line was deleted since: its page would open on nothing. */
export function isTargetGone(action: { targetType: string; targetLabel: string | null }): boolean {
  return namedTargetTypes.includes(action.targetType) && action.targetLabel === null;
}
