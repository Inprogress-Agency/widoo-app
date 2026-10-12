import { messages } from '@/messages/fr';
import { CheckIcon, PencilSimpleIcon, ProhibitIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@widoo/ui';
import { CharterChecklist, charterRuleCount } from './CharterChecklist';
import { SideCard } from './SideCard';

const texts = messages.moderation;

type DecisionPanelProps = {
  /** Indexes of the charter rules checked so far. */
  checkedRules: ReadonlySet<number>;
  onToggleRule: (rule: number) => void;
  onPublish: () => void;
  onRequestChanges: () => void;
  onReject: () => void;
  /** A decision is being sent: the buttons wait for its answer. */
  isBusy: boolean;
};

/**
 * The decision of the moderator: the charter to check, then « Publier » (once every rule is
 * checked, without confirmation), « Demander des modifications » and « Refuser », which both
 * open a window.
 */
export function DecisionPanel({
  checkedRules,
  onToggleRule,
  onPublish,
  onRequestChanges,
  onReject,
  isBusy,
}: DecisionPanelProps) {
  const isCharterMet = checkedRules.size === charterRuleCount;
  return (
    <SideCard
      title={texts.charter.title}
      aside={
        <span className="text-label text-muted-foreground">
          {texts.charter.progress(checkedRules.size, charterRuleCount)}
        </span>
      }
    >
      <CharterChecklist checked={checkedRules} onToggle={onToggleRule} />
      <div className="flex flex-col gap-8 border-t border-border pt-16">
        <Button
          onClick={onPublish}
          disabled={!isCharterMet || isBusy}
          aria-describedby="charter-hint"
        >
          <CheckIcon aria-hidden className="size-18" />
          {texts.decisions.publish}
        </Button>
        {isCharterMet ? null : (
          <p id="charter-hint" className="text-center text-label text-muted-foreground">
            {texts.charter.hint(charterRuleCount)}
          </p>
        )}
        <Button variant="outline" onClick={onRequestChanges} disabled={isBusy}>
          <PencilSimpleIcon aria-hidden className="size-18" />
          {texts.decisions.requestChanges}
        </Button>
        <Button variant="destructiveOutline" onClick={onReject} disabled={isBusy}>
          <ProhibitIcon aria-hidden className="size-18" />
          {texts.decisions.reject}
        </Button>
      </div>
    </SideCard>
  );
}
