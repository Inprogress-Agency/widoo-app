import { EyeSlashIcon } from '@phosphor-icons/react/ssr';

/** « Ce parcours n'est plus disponible » (E-21), the date of the removal when it is known. */
export function RemovedNotice({ title, body }: { title: string; body: string }) {
  return (
    <section className="flex gap-16 rounded-sheet bg-bg p-20">
      <span
        aria-hidden
        className="flex size-disc shrink-0 items-center justify-center rounded-pill bg-blue-soft text-blue-ink"
      >
        <EyeSlashIcon className="size-icon-l" />
      </span>
      <div className="flex flex-col gap-4">
        <h1 className="text-title-m text-ink">{title}</h1>
        <p className="text-body text-muted">{body}</p>
      </div>
    </section>
  );
}
