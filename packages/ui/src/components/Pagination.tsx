import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from './Button';

type PaginationProps = {
  /** Name of the navigation for screen readers: « Pages de la liste ». */
  label: string;
  previousLabel: string;
  nextLabel: string;
  /** Absent on the first page, and on the last one: the button is then disabled. */
  onPrevious?: () => void;
  onNext?: () => void;
};

/** « Précédent » and « Suivant » under a list paged by cursor: no page numbers, no total. */
export function Pagination({
  label,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
}: PaginationProps) {
  return (
    <nav aria-label={label} className="flex justify-end gap-8">
      <Button variant="secondary" size="small" onClick={onPrevious} disabled={!onPrevious}>
        <CaretLeftIcon aria-hidden className="size-16" />
        {previousLabel}
      </Button>
      <Button variant="secondary" size="small" onClick={onNext} disabled={!onNext}>
        {nextLabel}
        <CaretRightIcon aria-hidden className="size-16" />
      </Button>
    </nav>
  );
}
