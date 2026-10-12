import { messages } from '@/messages/fr';
import { Checkbox } from '@widoo/ui';

const texts = messages.moderation.charter;

/** Number of rules of the publication charter (wiki Creation-et-Moderation). */
export const charterRuleCount = texts.rules.length;

type CharterChecklistProps = {
  /** Indexes of the rules the moderator checked. */
  checked: ReadonlySet<number>;
  onToggle: (rule: number) => void;
};

/** The six rules of the publication charter, to check one by one before publishing. */
export function CharterChecklist({ checked, onToggle }: CharterChecklistProps) {
  return (
    <ul className="flex flex-col gap-12">
      {texts.rules.map((rule, index) => (
        <li key={rule.label}>
          <Checkbox
            label={rule.label}
            description={rule.description}
            checked={checked.has(index)}
            onChange={() => onToggle(index)}
          />
        </li>
      ))}
    </ul>
  );
}
