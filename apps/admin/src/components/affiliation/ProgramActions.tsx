import { messages } from '@/messages/fr';
import { Button } from '@widoo/ui';

const texts = messages.affiliation.programs.panel;

type ProgramActionsProps = {
  isActive: boolean;
  onEdit: () => void;
  /** Turns the program off, or back on. */
  onToggleActive: () => void;
  isBusy: boolean;
};

/** The actions of the card of a program (A-09): change it, turn it off or on. */
export function ProgramActions({ isActive, onEdit, onToggleActive, isBusy }: ProgramActionsProps) {
  return (
    <>
      <Button onClick={onEdit} disabled={isBusy}>
        {texts.edit}
      </Button>
      <Button
        variant={isActive ? 'destructiveOutline' : 'secondary'}
        onClick={onToggleActive}
        disabled={isBusy}
      >
        {isActive ? texts.deactivate : texts.activate}
      </Button>
    </>
  );
}
