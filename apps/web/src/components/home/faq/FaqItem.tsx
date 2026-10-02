import { MinusIcon, PlusIcon } from '@phosphor-icons/react/ssr';

/**
 * A question of « Questions fréquentes » (E-21): a tile that opens on its answer, white with a
 * blue edge when closed, light blue when open. Native `details`: opened with the mouse, the
 * keyboard and screen readers alike. The + turns into a − (200 ms); the answer opens in height
 * (`faq-item`, tailwind.config.cjs). The space under the answer is a padding, not a margin: a
 * margin is added only once the opening ends, and the tile then grew a second time.
 */
export function FaqItem({
  question,
  answer,
  open,
}: {
  question: string;
  answer: string;
  open?: boolean;
}) {
  return (
    <details
      open={open}
      className="faq-item group rounded-sheet bg-bg px-22 shadow-faq-edge transition duration-200 open:bg-blue-soft open:shadow-none"
    >
      <summary className="flex min-h-faq-question cursor-pointer list-none items-center justify-between gap-16 py-18">
        <h3 className="text-faq-question-phone text-ink md:text-faq-question">{question}</h3>
        <span
          aria-hidden
          className="relative flex size-faq-icon shrink-0 items-center justify-center rounded-pill bg-blue-soft transition-colors duration-200 group-open:bg-bg"
        >
          <PlusIcon
            weight="bold"
            className="absolute size-icon-s text-blue-ink transition duration-200 ease-out group-open:rotate-90 group-open:opacity-0 motion-reduce:rotate-0"
          />
          <MinusIcon
            weight="bold"
            className="absolute size-icon-s -rotate-90 text-blue-ink opacity-0 transition duration-200 ease-out group-open:rotate-0 group-open:opacity-100 motion-reduce:rotate-0"
          />
        </span>
      </summary>
      <p className="max-w-faq-answer pb-22 text-faq-answer text-ink">{answer}</p>
    </details>
  );
}
