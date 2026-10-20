import { messages } from '@/messages/fr';
import { Button } from '@widoo/ui';

const texts = messages.b2b.panel;

type PartnerActionsProps = {
  onEdit: () => void;
};

/** The actions of the card of a partner (A-10): change it. */
export function PartnerActions({ onEdit }: PartnerActionsProps) {
  return <Button onClick={onEdit}>{texts.edit}</Button>;
}
