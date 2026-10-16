import { messages } from '@/messages/fr';
import { ArrowRightIcon, CheckCircleIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@widoo/ui';
import { SideCard } from './SideCard';

const texts = messages.moderation.decisions.published;

type PublishedPanelProps = {
  /** First name of the member who published; null when it is not known. */
  publishedBy: string | null;
  onNext: () => void;
  onBackToCatalog: () => void;
};

/**
 * What the decision column shows once the route is published (A-02, « Publié à l'instant »):
 * the result, then the way on to the next route of the queue or to the catalog.
 */
export function PublishedPanel({ publishedBy, onNext, onBackToCatalog }: PublishedPanelProps) {
  return (
    <SideCard
      title={texts.title}
      aside={<CheckCircleIcon aria-hidden weight="fill" className="size-24 text-green-ink" />}
    >
      <div role="status" className="flex flex-col gap-4">
        {publishedBy ? (
          <p className="text-label text-muted-foreground">{texts.by(publishedBy)}</p>
        ) : null}
        <p className="text-body-s">{texts.text}</p>
      </div>
      <div className="flex flex-col gap-8">
        <Button onClick={onNext}>
          {texts.next}
          <ArrowRightIcon aria-hidden className="size-18" />
        </Button>
        <Button variant="outline" onClick={onBackToCatalog}>
          {texts.toCatalog}
        </Button>
      </div>
    </SideCard>
  );
}
