import { messages } from '@/messages/fr';
import { Button } from '@widoo/ui';

const texts = messages.b2b.panel;

type PartnerActionsProps = {
  onEdit: () => void;
  onChooseRoutes: () => void;
};

/** The actions of the card of a partner (A-10): change it, choose the routes of its page. */
export function PartnerActions({ onEdit, onChooseRoutes }: PartnerActionsProps) {
  return (
    <>
      <Button onClick={onEdit}>{texts.edit}</Button>
      <Button variant="secondary" onClick={onChooseRoutes}>
        {texts.chooseRoutes}
      </Button>
    </>
  );
}
